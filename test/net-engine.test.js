const TcpEngine = require('../js/lib/net-engine').TcpEngine;
const Session = require('../js/lib/session').Session;
const Mailbox = require('../js/lib/mailbox').Mailbox;
const EventEmit = require('events');

describe('test tcp encode/decode ', () => {
  
    test('haha', () => {
        let mockSocket = new EventEmit();
        let sendBuf;
        mockSocket.write = function(buf,cb){
            console.log(" send buf:",buf);
            sendBuf = buf;
            mockSocket.emit('data',buf);
            cb();
        }

        let engine = new TcpEngine(mockSocket);
        
        let session = new Session( );
        let mailbox = new Mailbox(session,engine,100,100);
        session.setMailBox(mailbox);

        session.send( [ Buffer.from("abcde"),Buffer.from("12345") ]);

        engine.on('data',(data)=>{
//            expect(data).toBe(sendBuf);
            console.log(".test .",data,sendBuf);
        });


    })
})
