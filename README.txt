Install node

I had to add apt repository https://deb.nodesource.com/node_8.x to get correct node version

apt-get install nodejs

Install npm

apt-get install npm

Add node packages

npm install bootstrap
npm install express
npm install express-ws
npm install jquery
npm install lodash
npm install redux
npm install redux-subscriber

Run server

run index.js as node app from your IDE or command line

Connect clients to server

There are four users defined in dummy backend (see initial-state.js)

users: {
    '62a36ee4': {
        id: '62a36ee4',
        name: 'Vanamo',
        roles: ['ORGANIZER', 'PARTICIPANT']
    },
    '62a36a5c': {
        id: '62a36a5c',
        name: 'Brendon',
        roles: ['PARTICIPANT']
    },
    '62a36ff2': {
        id: '62a36ff2',
        name: 'Nelson',
        roles: ['PARTICIPANT']
    },
    '62a370c4': {
        id: '62a370c4',
        name: 'Misti',
        roles: ['PARTICIPANT']
    }
}


Connect organizer websocket

http://localhost:1337/test.html?userId=62a36ee4

Connect regular user websockets

http://localhost:1337/test.html?userId=62a36a5c
http://localhost:1337/test.html?userId=62a370c4

Start session

curl -XPOST -H "Content-Type: application/json" http://localhost:1337/api/session/start/user-id/62a36ee4

User adds vote

curl -XPOST -H "Content-Type: application/json" http://localhost:1337/api/vote/1/user-id/62a36a5c

User removes vote

curl -XDELETE -H "Content-Type: application/json" http://localhost:1337/api/vote/1/user-id/62a36a5c

Organizer close session

curl -XPOST -H "Content-Type: application/json" http://localhost:1337/api/session/close/user-id/62a36ee4