'use strict';

const JOINING_SESSION = require('./user-connecting.action').JOINING_SESSION;
const DISCONNECTING = require('./user-disconnecting.action').DISCONNECTING;
const USER_RECOVERED = require('./user-recovered.action').USER_RECOVERED;
const USER_GONE = require('./user-gone.action').USER_GONE;
const USER_UPDATED = require('./recovered-user-updated.action').USER_UPDATED;

const userState = (users, action) => {
    switch (action.type) {
        case JOINING_SESSION:
            let userId = action.userId;
            if (users.connected.indexOf(userId) < 0) {
                return Object.assign({}, users, {
                    connected: users.connected.slice(0).concat([userId])
                });
            } else {
                console.log('ke?');
            }
            return users;
        case DISCONNECTING:
            if (users.connected.indexOf(action.userId) >= 0 && !users.disconnecting[action.userId]) {
                users.disconnecting[action.userId] = action.timeout;
            } // else clear timeout?

            return users;
        case USER_RECOVERED:
            delete users.disconnecting[action.userId];
            console.log(`recovered ${action.userId}`);

            return Object.assign({}, users, {
                recovered: action.userId
            });
        case USER_GONE:
            delete users.disconnecting[action.userId];
            const copy = users.connected.slice();
            copy.splice(copy.indexOf(action.userId), 1);
            console.log(`${action.userId} is gone.`);
            return Object.assign({}, users, {
                connected: copy,
                disconnecting: users.disconnecting,
                disconnected: users.disconnected.slice(0).concat([action.userId])
            });
        case USER_UPDATED:
            return Object.assign({}, users, {
                recovered: ''
            });
            break;
        default:
            return users;
    }
};

module.exports = userState;