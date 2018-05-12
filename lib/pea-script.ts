export function getRandomChar(len:number):string{
    var str ="abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNOPQRSTUVWXYZ123456789";
    var random =[];
    for(let i =0 ;i<len ;i++){
        let rand = Math.floor(Math.random() * str.length);
        random.push(str.charAt(rand));
    };
    return random.join('');
};

export function Assert<T>(val:T){return val};

export function doThatOr<T,U,E=null>(it:T, that:(it:T)=>U, or?:E|null):U|E{
    if(it)return that(it);
    else  return or as E;
}
