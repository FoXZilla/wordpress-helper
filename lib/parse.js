"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pea_script_1 = require("./pea-script");
const common_1 = require("./common");
const format_content_1 = require("./format-content");
const Path = require('path');
const Fs = require('fs');
const xml2js = require('xml2js').parseString;
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
    RawData.rss.channel[0]['wp:tag'].forEach(function (item) {
        Tag.push({
            name: pea_script_1.doThatOr(item['wp:tag_name'], v => v[0]),
            alias: pea_script_1.doThatOr(item['wp:tag_slug'], v => v[0]),
            description: pea_script_1.doThatOr(item['wp:tag_description'], v => v[0], ''),
        });
    });
    RawData.rss.channel[0]['wp:category'].forEach(function (item) {
        Category.push({
            name: pea_script_1.doThatOr(item['wp:cat_name'], v => v[0]),
            alias: pea_script_1.doThatOr(item['wp:category_nicename'], v => v[0]),
            description: pea_script_1.doThatOr(item['wp:category_description'], v => v[0], ''),
            parent_alias: pea_script_1.doThatOr(item['wp:category_parent'], v => v[0]),
        });
    });
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
                    description: pea_script_1.doThatOr(item['excerpt:encoded'], v => v[0]),
                    state: pea_script_1.doThatOr(item['wp:status'], v => StateMap[v[0]]),
                    tag_list: pea_script_1.doThatOr(item['category'], v => v.filter((i) => i.$.domain === 'post_tag').map((i) => i.$.nicename)),
                    category_list: pea_script_1.doThatOr(item['category'], v => v.filter((i) => i.$.domain === 'category').map((i) => i.$.nicename)),
                    update_time: common_1.toIOSDate(pea_script_1.doThatOr(item['wp:post_date'], v => v[0])),
                    create_time: common_1.toIOSDate(pea_script_1.doThatOr(item['pubDate'], v => v[0])),
                    view_count: pea_script_1.doThatOr(item['wp:postmeta'], v => pea_script_1.doThatOr(v.find((i) => i['wp:meta_key'][0] === 'post_views_count'), i => +i['wp:meta_value'][0], 0), 0),
                    md_content: format_content_1.default(pea_script_1.doThatOr(item['content:encoded'], v => v[0])),
                    meta: {
                        no_comment: pea_script_1.doThatOr(item['content:comment_status'], v => v[0] !== 'open', false),
                        password: pea_script_1.doThatOr(item['wp:post_password'], v => v[0]),
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
                        author: userId,
                        md_content: pea_script_1.doThatOr(comment['wp:comment_content'], v => v[0]),
                    });
                    if (pea_script_1.doThatOr(comment['wp:comment_parent'], v => !!v[0], false)) {
                        var parentCommentId = pea_script_1.doThatOr(comment['wp:comment_parent'], v => +v[0]);
                        if (parentCommentId === 0)
                            continue;
                        var parentComment = Comment.find(i => i.id === parentCommentId);
                        if (!parentComment) {
                            console.warn(`Can't found comment #${parentCommentId}`);
                            continue;
                        }
                        ;
                        var replyUserId = +parentComment.author;
                        var replyUserInfo = User.find(u => u.id === replyUserId);
                        Comment[Comment.length - 1].md_content =
                            `@${replyUserInfo.nickname} `
                                + Comment[Comment.length - 1].md_content;
                    }
                    ;
                }
                ;
                break;
            case 'attachment':
                Attachment.push(item['wp:attachment_url'][0]);
                break;
        }
        ;
    });
    return {
        version: require('@foxzilla/fireblog/package.json').version,
        api_url: pea_script_1.doThatOr(RawData.rss.channel[0]['link'], v => v[0], ''),
        front_url: pea_script_1.doThatOr(RawData.rss.channel[0]['link'], v => v[0], ''),
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
