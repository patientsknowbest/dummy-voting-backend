'use strict';

const checkIfGone = require('./check-if-gone.action');
const userRecovered = require('./user-recovered.action');
const userGone = require('./user-gone.action');

const JOINING_SESSION = require('./user-connecting.action').JOINING_SESSION;
const DISCONNECTING = require('./user-disconnecting.action').DISCONNECTING;
const CHECK_IF_GONE = checkIfGone.CHECK_IF_GONE;

const userRecovery = (store) => (next) => (action) => {
    function userIsScheduledForCleanup() {
        return !!store.getState().session.users.disconnecting[action.userId];
    }

    switch (action.type) {
        case JOINING_SESSION:
            if (userIsScheduledForCleanup()) {
                clearTimeout(store.getState().session.users.disconnecting[action.userId]);
                store.dispatch(userRecovered(action.userId));
            } else {
                next(action);
            }
            break;
        case DISCONNECTING:
            action.timeout = setTimeout(() => {
                store.dispatch(checkIfGone(action.userId));
            }, 5000);
            next(action);
            break;
        case CHECK_IF_GONE:
            if (userIsScheduledForCleanup()) {
                store.dispatch(userGone(action.userId));
            }

            return;
        default:
            next(action);
    }
};

module.exports = userRecovery;