import {ArticleStatus, FireBlogData} from "@foxzilla/fireblog";
import {doThatOr} from "./pea-script";
import {toIOSDate} from './common';
import formatConent from './format-content';

const Path =require('path');
const Fs =require('fs');
const xml2js =require('xml2js').parseString;


export default async function parse(path:string):Promise<FireBlogData>{
    const StateMap:any ={
        publish :ArticleStatus.Publish,
        trash   :ArticleStatus.Trash,
        private :ArticleStatus.Private,
        draft   :ArticleStatus.Draft,
    };
    const RawData:any =await new Promise(r=>xml2js(Fs.readFileSync(path),(e:Error,d:any)=>r(d)));
    const {
        tag:Tag,
        category:Category,
        article:Article,
        user:User,
        comment:Comment,
        attachment:Attachment,
    }:FireBlogData['data']={
        tag         :[],
        category    :[],
        article     :[],
        user        :[],
        comment     :[],
        attachment  :[]
    };

    RawData.rss.channel[0]['wp:tag'].forEach(function(item:any){
        Tag.push({
            name        :doThatOr(item['wp:tag_name'],v=>v[0]),
            alias       :doThatOr(item['wp:tag_slug'],v=>v[0]),
            description :doThatOr(item['wp:tag_description'],v=>v[0],''),
        });
    });
    RawData.rss.channel[0]['wp:category'].forEach(function(item:any){
        Category.push({
            name         :doThatOr(item['wp:cat_name'],v=>v[0]),
            alias        :doThatOr(item['wp:category_nicename'],v=>v[0]),
            description  :doThatOr(item['wp:category_description'],v=>v[0],''),
            parent_alias :doThatOr(item['wp:category_parent'],v=>v[0]),
        });
    });
    RawData.rss.channel[0]['item'].forEach(function(item:any){
        switch(doThatOr(item['wp:post_type'],v=>v[0])){
            case 'post':
                if(doThatOr(item['wp:post_date'],v=>v[0]) ==='0000-00-00 00:00:00'){
                    item['wp:post_date'][0] =new Date().toISOString();
                };
                Article.push({
                    id             :doThatOr(item['wp:post_id'],v=>+v[0],0),
                    title          :doThatOr(item['title'],v=>v[0]),
                    description    :doThatOr(item['excerpt:encoded'],v=>v[0]),
                    state          :doThatOr(item['wp:status'],v=>StateMap[v[0]]),
                    tag_list       :doThatOr(item['category'],v=>v.filter((i:any)=>i.$.domain==='post_tag').map((i:any)=>i.$.nicename)),
                    category_list  :doThatOr(item['category'],v=>v.filter((i:any)=>i.$.domain==='category').map((i:any)=>i.$.nicename)),
                    update_time    :toIOSDate(doThatOr(item['wp:post_date'],v=>v[0])),
                    create_time    :toIOSDate(doThatOr(item['pubDate'],v=>v[0])),
                    view_count     :doThatOr(
                        item['wp:postmeta'],
                        v=>doThatOr(v.find((i:any)=>i['wp:meta_key'][0]==='post_views_count'),i=>+i['wp:meta_value'][0],0),
                        0,
                    ),
                    md_content     :formatConent(doThatOr(item['content:encoded'],v=>v[0])),
                    meta :{
                        no_comment :doThatOr(item['content:comment_status'],v=>v[0]!=='open',false)!,
                        password   :doThatOr(item['wp:post_password'],v=>v[0]),
                    },
                });
                for(let comment of doThatOr(item['wp:comment'],v=>v,[])){// It's dependency sort of wp:comment_id
                    if(doThatOr(comment['wp:comment_approved'],v=>v[0]) !=='1')continue;
                    let userId =User.push({
                        id      :User.length+1,
                        origin  :'wordpress',
                        open_id :'',
                        nickname:doThatOr(comment['wp:comment_author'],v=>v[0]),
                        mail    :doThatOr(comment['wp:comment_author_email'],v=>v[0]),
                        create_date :toIOSDate(doThatOr(comment['wp:comment_date'],v=>v[0])),
                    });
                    Comment.push({
                        id         :doThatOr(comment['wp:comment_id'],v=>+v[0],0),
                        date       :toIOSDate(doThatOr(comment['wp:comment_date'],v=>v[0])),
                        article_id :doThatOr(item['wp:post_id'],v=>+v[0],0),
                        author     :userId,
                        md_content :doThatOr(comment['wp:comment_content'],v=>v[0]),
                    });
                    if(doThatOr(comment['wp:comment_parent'],v=>!!v[0],false)){
                        var parentCommentId =doThatOr(comment['wp:comment_parent'],v=>+v[0]);
                        if(parentCommentId===0)continue;
                        var parentComment =Comment.find(i=>i.id===parentCommentId);
                        if(!parentComment){
                            console.warn(`Can't found comment #${parentCommentId}`);
                            continue;
                        };
                        var replyUserId =+parentComment.author;
                        var replyUserInfo =User.find(u=>u.id===replyUserId)!;
                        Comment[Comment.length-1].md_content =
                            `@${replyUserInfo.nickname} `
                            +Comment[Comment.length-1].md_content
                        ;
                    };
                };
                break;
            case 'attachment':
                Attachment.push(item['wp:attachment_url'][0]);
                break;
        };
    });
    return {
        version     :require('@foxzilla/fireblog/package.json').version,
        api_url     :doThatOr(RawData.rss.channel[0]['link'],v=>v[0],''),
        front_url   :doThatOr(RawData.rss.channel[0]['link'],v=>v[0],''),
        data        :{
            tag       :Tag,
            category  :Category,
            article   :Article,
            user      :User,
            comment   :Comment,
            attachment:Attachment,
        },
    };
};
