import {Mailbox} from "../mailbox";
import {Session} from "../session";

class Message{
    _type:number;
    _id:number;
    constructor( type:number,id:number ){
        this._type = type;
        this._id = id;
    }    

}



class HearbeatMsg extends Message{
    private _time:number;
    constructor(type:number,id:number){
        super(type,id);
        this._time = Date.now();
    }    
    get time():number{
        return this._time; 
    }
}

function send(msg:Message){
}




let m = new Message(1,1);
let mt:Message = {_type:1,_id:1};
send(mt);
send(new HearbeatMsg(1,2));
interface service{
    send:()=>void;
}
interface serviceE{
    receive:()=>void;
}

class simpl implements service,serviceE{
    send(){

    }
    receive(){

    }
}

function serverImpl(msg:HearbeatMsg,session:Session) {
    // to do
    let t = msg.time;
//    session.send()

}