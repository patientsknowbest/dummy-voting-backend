module.exports = {
    session: {
        status: 'TO_BE_STARTED',
        wentWellItems: [
            {id: 1, displayText: 'PRs'},
            {id: 12, displayText: 'New process', parentId: 1},
            {id: 13, displayText: 'More readable and useful PR comments.', parentId: 1},
            {id: 14, displayText: 'Most valuable PR first.', parentId: 1},
            {id: 2, displayText: 'Tests'},
            {id: 22, displayText: 'Coverage increasing', parentId: 2},
            {id: 23, displayText: 'Flakyness decreasing.', parentId: 2},
            {id: 24, displayText: 'Integraton tests for Struts.', parentId: 2},
            {id: 3, displayText: 'GDE'},
            {id: 32, displayText: 'Regular and organized calls'},
            {id: 33, displayText: 'Well defined Teams.'}
        ],
        toBeImprovedItems: [],
        users: {
            connected: [],
            disconnecting: {},
            recovered: undefined,
            disconnected: []
        },
        votes: [],
        wentWellVoteLimit: 3,
        toBeImprovedVoteLimit: 3
    },
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
};