
import {Session} from './session'
import {NetEngine} from './net-engine'


class QueueNode{
    public data:any;
    public next:QueueNode;
    constructor(data){
        this.data = data;
        this.next = null;
    }
}

class Queue{
    private head:QueueNode;
    private tail:QueueNode;
    public  _count:number;
    get count(){
        return this._count;
    }
    constructor(){
        this.head =  this.tail = null;
        this._count = 0;
    }
    getHead():QueueNode{
        return this.head;
    }
    add( node:QueueNode){
       if(this.head == null ) {
           this.head = this.tail =  node;
       }else{
           this.tail.next = node;
           node.next = null;
           this.tail = node;
       }
       this._count++;
    }
    remove(){
        if( this.head != null ){
            this.head = this.head.next;
            if(this.head == null ){
                this.tail = null;
            }
            this._count--;
        }
    }
}

class Mailbox{
    private _inputQ:Queue;
    private _outputQ:Queue;
    private _maxInputQLen:number;
    private _maxOutputQLen:number;

    private _netEngine:NetEngine;
    private _session:Session;

    constructor(session:Session, netEngine:NetEngine, maxInputQLen:number = 0, maxOutputQLen:number=0){

        let self = this;
        this._maxInputQLen = maxInputQLen;
        this._maxOutputQLen = maxOutputQLen;
        this._inputQ = new Queue();
        this._outputQ= new Queue();
        this._session = session;
        this._session.setMailBox(this);
        this.netEngine = netEngine;


    }
    get netEngine():NetEngine{
        return this._netEngine; 
    }
    set netEngine(netEngine:NetEngine){
        if( !this._netEngine && !!netEngine ){
            this._netEngine = netEngine
            this._netEngine.on('data',this.recv.bind(this) );
            this._netEngine.on('close',(err)=>{
                this._session.onClose(err);
            });
            this.queueSend();
        }    
    }
    private queueSend(){
        let self=this; 
        let node= this._outputQ.getHead();
        if( node != null && self._netEngine != null ){
            self._netEngine.send( node.data, ()=>{
                self._outputQ.remove();
                self.queueSend();
            })
        }

    }
    private queueRecv(){
        let self=this; 
        let node= this._inputQ.getHead();
        if( node != null ){
            self._session.recv( node.data, ()=>{
                self._inputQ.remove();
                self.queueRecv();
            })
        }
    }
    send(data:Buffer):boolean {
       /* if(this._maxOutputQLen == 0  ){
            this._netEngine.send(data);
            return true;
        }else 
        */
        if(this._maxOutputQLen <= this._outputQ.count){
            //to do. logger.
            return false;
        }else{
            this._outputQ.add( new QueueNode(data) );
            if( this._outputQ.count == 1 ){
                this.queueSend( )
            }
        }
    }

    recv(data:Buffer):boolean{
        console.log("mailbox recv:",data);
        if( this._maxInputQLen == 0 ){
            this._session.recv(data );
            return true;
        }else if(this._maxInputQLen <= this._inputQ.count){
            //to do.logger;
            console.error(` recv too much data:maxLen:${this._maxInputQLen} `)
            return false;
        }else{
            this._inputQ.add( new QueueNode(data) );
            if( this._inputQ.count == 1){
                this.queueRecv();
            }
        }
    }
}

export {Mailbox};