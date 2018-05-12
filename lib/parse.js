"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pea_script_1 = require("./pea-script");
const common_1 = require("./common");
const format_content_1 = require("./format-content");
const firebean = require("@foxzilla/fireblog-sdk/firebean");
const Path = require('path');
const Fs = require('fs');
const xml2js = require('xml2js').parseString;
const Gravatar = require('gravatar');
const Readline = require('readline');
async function parse(path) {
    const StateMap = {
        publish: 0 /* Publish */,
        trash: 2 /* Trash */,
        private: 1 /* Private */,
        draft: 3 /* Draft */,
    };
    const RawData = await new Promise(r => xml2js(Fs.readFileSync(path), (e, d) => r(d)));
    const { tag: Tag, category: Category, article: Article, user: User, comment: Comment, attachment: Attachment, } = {
        tag: [],
        category: [],
        article: [],
        user: [],
        comment: [],
        attachment: []
    };
    const Meta = {
        front_url: '',
        api_url: '',
        author: {
            names: ['FoXZilla'],
            mail: '',
        },
    };
    const CategoryMap = {};
    if (RawData.rss.channel[0]['wp:tag'])
        RawData.rss.channel[0]['wp:tag'].forEach(function (item) {
            Tag.push({
                name: pea_script_1.doThatOr(item['wp:tag_name'], v => v[0]),
                alias: pea_script_1.doThatOr(item['wp:tag_slug'], v => v[0]),
                description: pea_script_1.doThatOr(item['wp:tag_description'], v => v[0], undefined),
            });
        });
    if (RawData.rss.channel[0]['wp:category'])
        RawData.rss.channel[0]['wp:category'].forEach(function (item) {
            Category.push({
                name: pea_script_1.doThatOr(item['wp:cat_name'], v => pea_script_1.doThatOr(v[0], v => v)),
                alias: pea_script_1.doThatOr(item['wp:category_nicename'], v => v[0]),
                description: pea_script_1.doThatOr(item['wp:category_description'], v => pea_script_1.doThatOr(v[0], v => v)),
                parent_alias: pea_script_1.doThatOr(item['wp:category_parent'], v => pea_script_1.doThatOr(v[0], v => v)),
            });
            CategoryMap[item['wp:term_id'][0]] = Category[Category.length - 1];
        });
    if (RawData.rss.channel[0]['item'])
        RawData.rss.channel[0]['item'].forEach(function (item) {
            switch (pea_script_1.doThatOr(item['wp:post_type'], v => v[0])) {
                case 'post':
                    if (pea_script_1.doThatOr(item['wp:post_date'], v => v[0]) === '0000-00-00 00:00:00') {
                        item['wp:post_date'][0] = new Date().toISOString();
                    }
                    ;
                    Article.push({
                        id: pea_script_1.doThatOr(item['wp:post_id'], v => +v[0], 0),
                        title: pea_script_1.doThatOr(item['title'], v => v[0]),
                        description: pea_script_1.doThatOr(item['excerpt:encoded'], v => pea_script_1.doThatOr(v[0], v => v)),
                        state: pea_script_1.doThatOr(item['wp:status'], v => StateMap[v[0]]),
                        tag_list: pea_script_1.doThatOr(item['category'], v => v.filter((i) => i.$.domain === 'post_tag').map((i) => i.$.nicename)),
                        category_list: pea_script_1.doThatOr(item['category'], v => v.filter((i) => i.$.domain === 'category').map((i) => i.$.nicename)),
                        update_time: common_1.toIOSDate(pea_script_1.doThatOr(item['wp:post_date'], v => v[0])),
                        create_time: common_1.toIOSDate(pea_script_1.doThatOr(item['pubDate'], v => v[0])),
                        view_count: pea_script_1.doThatOr(item['wp:postmeta'], v => pea_script_1.doThatOr(v.find((i) => i['wp:meta_key'][0] === 'post_views_count'), i => +i['wp:meta_value'][0], 0), 0),
                        md_content: format_content_1.default(pea_script_1.doThatOr(item['content:encoded'], v => v[0])),
                        meta: {
                            no_comment: pea_script_1.doThatOr(item['content:comment_status'], v => v[0] !== 'open', false),
                            password: pea_script_1.doThatOr(item['wp:post_password'], v => pea_script_1.doThatOr(v[0], v => v)),
                        },
                    });
                    for (let comment of pea_script_1.doThatOr(item['wp:comment'], v => v, [])) {
                        if (pea_script_1.doThatOr(comment['wp:comment_approved'], v => v[0]) !== '1')
                            continue;
                        let userId = User.push({
                            id: User.length + 1,
                            origin: 'wordpress',
                            open_id: '',
                            nickname: pea_script_1.doThatOr(comment['wp:comment_author'], v => v[0]),
                            mail: pea_script_1.doThatOr(comment['wp:comment_author_email'], v => v[0]),
                            create_date: common_1.toIOSDate(pea_script_1.doThatOr(comment['wp:comment_date'], v => v[0])),
                        });
                        Comment.push({
                            id: pea_script_1.doThatOr(comment['wp:comment_id'], v => +v[0], 0),
                            date: common_1.toIOSDate(pea_script_1.doThatOr(comment['wp:comment_date'], v => v[0])),
                            article_id: pea_script_1.doThatOr(item['wp:post_id'], v => +v[0], 0),
                            author_id: userId,
                            md_content: pea_script_1.doThatOr(comment['wp:comment_content'], v => v[0]),
                        });
                        if (pea_script_1.doThatOr(comment['wp:comment_parent'], v => !!v[0], false)) {
                            var parentCommentId = pea_script_1.doThatOr(comment['wp:comment_parent'], v => +v[0], 0);
                            if (parentCommentId === 0)
                                continue;
                            var parentComment = Comment.find(i => i.id === parentCommentId);
                            if (!parentComment) {
                                console.warn(`Can't found comment #${parentCommentId}`);
                                continue;
                            }
                            ;
                            var replyUserId = +parentComment.author_id;
                            var replyUserInfo = User.find(u => u.id === replyUserId);
                            var currentComment = Comment[Comment.length - 1];
                            currentComment.reply_to = function (id) {
                                while (true) {
                                    let comment = Comment.find(i => i.id === id);
                                    if ('reply_to' in comment) {
                                        id = comment.reply_to;
                                    }
                                    else
                                        break;
                                }
                                ;
                                return id;
                            }(parentCommentId);
                            currentComment.md_content =
                                `[@${replyUserInfo.nickname}](${firebean.stringify({
                                    _type: "go_user" /* goUser */,
                                    id: replyUserInfo.id,
                                })}) `
                                    + currentComment.md_content;
                        }
                        ;
                    }
                    ;
                    break;
                case 'attachment':
                    Attachment.push(item['wp:attachment_url'][0].trim());
                    break;
            }
            ;
        });
    pea_script_1.doThatOr(RawData.rss.channel[0]['pubDate'], v => Meta.publish_date = new Date(v[0]).toISOString());
    pea_script_1.doThatOr(RawData.rss.channel[0]['description'], v => Meta.description = v[0]);
    pea_script_1.doThatOr(RawData.rss.channel[0]['language'], v => Meta.language = v[0]);
    pea_script_1.doThatOr(RawData.rss.channel[0]['wp:base_blog_url'], v => Meta.front_url = v[0]);
    pea_script_1.doThatOr(RawData.rss.channel[0]['wp:author'], author => Meta.author = {
        names: [
            pea_script_1.doThatOr(author[0]['wp:author_display_name'], v => v[0], ''),
            pea_script_1.doThatOr(author[0]['wp:author_first_name'], v => v[0], ''),
            pea_script_1.doThatOr(author[0]['wp:author_last_name'], v => v[0], ''),
        ].filter(v => Boolean(v)),
        mail: pea_script_1.doThatOr(author[0]['wp:author_email'], v => v[0], 'root@localhost'),
    });
    Meta.nav = await async function () {
        if (!RawData.rss.channel[0]['item'])
            return;
        var Result = [];
        var allNavItem = RawData.rss.channel[0]['item']
            .filter((item) => item['wp:post_type'][0] === 'nav_menu_item')
            .filter((item) => item['wp:status'][0] !== 'draft')
            .map(getNavItemInfo);
        var groups = [...new Set(allNavItem.map(i => i.group))];
        if (groups.length > 1) {
            console.log('Which nav is you want?');
            groups.forEach((item, index) => {
                console.log(`${index}. ${item}`);
            });
            let rl = Readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            var input = await new Promise(function (resolve) {
                rl.question(`Enter [${new Array(groups.length).fill(0).map((item, index) => index).join('/')}]:`, resolve);
            });
            rl.close();
            allNavItem = allNavItem.filter((item) => item.group === groups[Number(input)]);
        }
        ;
        for (let postMeta of allNavItem) {
            switch (postMeta._menu_item_type) {
                case 'custom':
                    Result.push({
                        type: 'link',
                        href: postMeta._menu_item_url,
                        text: postMeta.name,
                    });
                    break;
                case 'taxonomy': {
                    let category = CategoryMap[postMeta._menu_item_object_id];
                    Result.push({
                        type: 'category',
                        alias: category.alias,
                        text: postMeta.name || category.name,
                    });
                    break;
                }
                case 'post_type':
                    Result.push({
                        type: 'article',
                        id: Number(postMeta._menu_item_object_id),
                        text: postMeta.name,
                    });
                    break;
                default:
                    console.warn('skip', postMeta);
            }
            ;
        }
        ;
        return Result;
    }();
    return {
        name: pea_script_1.doThatOr(RawData.rss.channel[0]['title'], v => v[0], 'A FireBlog'),
        version: require('@foxzilla/fireblog/package.json').version,
        meta: Meta,
        data: {
            tag: Tag,
            category: Category,
            article: Article,
            user: User,
            comment: Comment,
            attachment: Attachment,
        },
    };
}
exports.default = parse;
;
function getNavItemInfo(rawItem) {
    let postMeta = {};
    for (let meta of rawItem['wp:postmeta']) {
        postMeta[meta['wp:meta_key'][0]]
            =
                meta['wp:meta_value'][0];
    }
    ;
    postMeta.link = rawItem['link'][0];
    postMeta.name = rawItem['title'][0];
    postMeta.order = Number(rawItem['wp:menu_order'][0]);
    postMeta.group = rawItem['category'][0]._;
    return postMeta;
}
;
