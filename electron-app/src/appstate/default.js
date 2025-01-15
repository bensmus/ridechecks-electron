const defaultAppState = {
    rides: [
        {ride: 'Rollercoaster', time: 22},
        {ride: 'Helevator', time: 10},
        {ride: 'Flume', time: 13},
        {ride: 'Launcher', time: 25}
    ],
    workers: [
        {worker: 'Alex', canCheck: ['Rollercoaster', 'Launcher']},
        {worker: 'Kennedy', canCheck: ['Flume', 'Launcher']},
        {worker: 'Gio', canCheck: ['Rollercoaster', 'Helevator']},
        {worker: 'Alexa', canCheck: ['Flume', 'Helevator']}
    ],
    dayrestrict: [
        {
            day: 'Monday',
            time: 25,
            closedRides: ['Rollercoaster', 'Helevator'],
            absentWorkers: ['Alexa', 'Kennedy'],
        },
        {
            day: 'Tuesday',
            time: 50,
            closedRides: [],
            absentWorkers: ['Kennedy'],
        }
    ],
    // ridechecks: Not user editable. It may be out of sync with dayrestrict
    // (for example if the day name changes) until generate is hit again.
    ridechecks: [
        {
            day: 'Thursday',
            ridecheck: {
                'Rollercoaster': 'Alex',
                'Flume': 'Alexa',
                'Launcher': 'Gio',
                'Helevator': 'Kennedy'
            }
        },
        {
            day: 'Tuesday',
            ridecheck: {
                'Rollercoaster': 'Alex',
                'Flume': 'Alexa',
                'Launcher': 'Gio',
                'Helevator': 'Kennedy'
            }
        }
    ]
};

export default defaultAppState;
