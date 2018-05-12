import {ArticleStatus ,CategoryRaw ,FireBlogData ,FireBean} from "@foxzilla/fireblog";
import {doThatOr} from "./pea-script";
import {toIOSDate} from './common';
import formatConent from './format-content';
import {NavConfig} from "@foxzilla/fireblog/types/export";
import * as firebean from '@foxzilla/fireblog-sdk/firebean';

const Path =require('path');
const Fs =require('fs');
const xml2js =require('xml2js').parseString;
const Gravatar = require('gravatar');
const Readline = require('readline');


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
    const Meta:FireBlogData['meta'] ={
        front_url :'',
        api_url :'',
        author :{
            names :['FoXZilla'],
            mail  :'',
        },
    };
    const CategoryMap:{[id:string]:CategoryRaw} ={};

    if(RawData.rss.channel[0]['wp:tag'])
    RawData.rss.channel[0]['wp:tag'].forEach(function(item:any){
        Tag.push({
            name        :doThatOr(item['wp:tag_name'],v=>v[0]),
            alias       :doThatOr(item['wp:tag_slug'],v=>v[0]),
            description :doThatOr(item['wp:tag_description'],v=>v[0],undefined),
        });
    });
    if(RawData.rss.channel[0]['wp:category'])
    RawData.rss.channel[0]['wp:category'].forEach(function(item:any){
        Category.push({
            name         :doThatOr(item['wp:cat_name'],v=>doThatOr(v[0],v=>v)),
            alias        :doThatOr(item['wp:category_nicename'],v=>v[0]),
            description  :doThatOr(item['wp:category_description'],v=>doThatOr(v[0],v=>v)),
            parent_alias :doThatOr(item['wp:category_parent'],v=>doThatOr(v[0],v=>v)),
        });
        CategoryMap[item['wp:term_id'][0]] =Category[Category.length-1];
    });
    if(RawData.rss.channel[0]['item'])
    RawData.rss.channel[0]['item'].forEach(function(item:any){
        switch(doThatOr(item['wp:post_type'],v=>v[0])){
            case 'post':
                if(doThatOr(item['wp:post_date'],v=>v[0]) ==='0000-00-00 00:00:00'){
                    item['wp:post_date'][0] =new Date().toISOString();
                };
                Article.push({
                    id             :doThatOr(item['wp:post_id'],v=>+v[0],0),
                    title          :doThatOr(item['title'],v=>v[0]),
                    description    :doThatOr(item['excerpt:encoded'],v=>doThatOr(v[0],v=>v)),
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
                        password   :doThatOr(item['wp:post_password'],v=>doThatOr(v[0],v=>v)),
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
                        author_id  :userId,
                        md_content :doThatOr(comment['wp:comment_content'],v=>v[0]),
                    });
                    if(doThatOr(comment['wp:comment_parent'],v=>!!v[0],false)){
                        var parentCommentId =doThatOr(comment['wp:comment_parent'],v=>+v[0],0);
                        if(parentCommentId===0)continue;
                        var parentComment =Comment.find(i=>i.id===parentCommentId);
                        if(!parentComment){
                            console.warn(`Can't found comment #${parentCommentId}`);
                            continue;
                        };
                        var replyUserId =+parentComment.author_id;
                        var replyUserInfo =User.find(u=>u.id===replyUserId)!;
                        var currentComment = Comment[Comment.length-1];
                        currentComment.reply_to =function(id){
                            while(true){
                                let comment =Comment.find(i=>i.id===id)!;
                                if('reply_to' in comment){
                                    id =comment.reply_to!;
                                }else break;
                            };
                            return id;
                        }(parentCommentId);
                        currentComment.md_content =
                            `[@${replyUserInfo.nickname}](${firebean.stringify({
                                _type :FireBean.Type.goUser,
                                id    :replyUserInfo.id,
                            })}) `
                            +currentComment.md_content
                        ;
                    };
                };
                break;
            case 'attachment':
                Attachment.push(item['wp:attachment_url'][0].trim());
                break;
        };
    });

    doThatOr(RawData.rss.channel[0]['pubDate']         ,v=>Meta.publish_date=new Date(v[0]).toISOString());
    doThatOr(RawData.rss.channel[0]['description']     ,v=>Meta.description=v[0]);
    doThatOr(RawData.rss.channel[0]['language']        ,v=>Meta.language=v[0]);
    doThatOr(RawData.rss.channel[0]['wp:base_blog_url'],v=>Meta.front_url=v[0]);


    doThatOr(RawData.rss.channel[0]['wp:author'],author=>Meta.author ={
        names :[
            doThatOr(author[0]['wp:author_display_name'],v=>v[0],''),
            doThatOr(author[0]['wp:author_first_name'],v=>v[0],''),
            doThatOr(author[0]['wp:author_last_name'],v=>v[0],''),
        ].filter(v=>Boolean(v)),
        mail :doThatOr(author[0]['wp:author_email'],v=>v[0],'root@localhost'),
    });


    Meta.nav =await async function():Promise<NavConfig[]|undefined>{
        if(!RawData.rss.channel[0]['item'])return;
        var Result:NavConfig[] =[];
        var allNavItem:NavItemInfo[] =RawData.rss.channel[0]['item']
            .filter((item:any)=>item['wp:post_type'][0]==='nav_menu_item')
            .filter((item:any)=>item['wp:status'][0]!=='draft')
            .map(getNavItemInfo)
        ;

        var groups:string[] =[...new Set(allNavItem.map(i=>i.group))];
        if(groups.length >1){
            console.log('Which nav is you want?');
            groups.forEach((item:string,index)=>{
                console.log(`${index}. ${item}`);
            });
            let rl =Readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            var input:string =await new Promise<string>(function(resolve){
                rl.question(
                    `Enter [${new Array(groups.length).fill(0).map((item:number,index)=>index).join('/')}]:`,
                    resolve,
                )
            });
            rl.close();
            allNavItem =allNavItem.filter((item:NavItemInfo)=>item.group===groups[Number(input)]);
        };

        for(let postMeta of allNavItem){
            switch(postMeta._menu_item_type){
                case 'custom':
                    Result.push({
                        type :'link',
                        href :postMeta._menu_item_url,
                        text :postMeta.name,
                    });
                    break;
                case 'taxonomy':{
                    let category =CategoryMap[postMeta._menu_item_object_id];
                    Result.push({
                        type :'category',
                        alias:category.alias,
                        text :postMeta.name ||category.name,
                    });
                    break;
                }case 'post_type':
                    Result.push({
                        type :'article',
                        id   :Number(postMeta._menu_item_object_id),
                        text :postMeta.name,
                    });
                    break;
                default:
                    console.warn('skip',postMeta);
            };
        };

        return Result;
    }();

    return {
        name        :doThatOr(RawData.rss.channel[0]['title'],v=>v[0],'A FireBlog'),
        version     :require('@foxzilla/fireblog/package.json').version,
        meta        :Meta,
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

interface NavItemInfo{
    link: string;
    name: string;
    order: number;
    group: string;
    _menu_item_menu_item_parent :string;
    _menu_item_object_id :string;
    _menu_item_object :'post'|'custom'|'category';
    _menu_item_type :'post_type'|'custom'|'taxonomy';
    _menu_item_target :string;
    _menu_item_classes :string;
    _menu_item_xfn :string;
    _menu_item_url :string;
}
function getNavItemInfo(rawItem:any):NavItemInfo{
    let postMeta:any ={};
    for(let meta of rawItem['wp:postmeta']){
        postMeta
            [meta['wp:meta_key'][0]]
            =
            meta['wp:meta_value'][0]
        ;
    };
    postMeta.link  =rawItem['link'][0];
    postMeta.name  =rawItem['title'][0];
    postMeta.order =Number(rawItem['wp:menu_order'][0]);
    postMeta.group =rawItem['category'][0]._;
    return postMeta;
};
