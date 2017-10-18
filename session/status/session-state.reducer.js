'use strict';

const OPEN_SESSION = require('./open-session.action').OPEN_SESSION;
const CLOSE_SESSION = require('./close-session.action').CLOSE_SESSION;

const sessionState = (state, action) => {
    switch (action.type) {
        case OPEN_SESSION:
            return 'OPENED';
        case CLOSE_SESSION:
            return 'CLOSED';
        default:
            return state;
    }
};

module.exports = sessionState;