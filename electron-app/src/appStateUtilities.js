export const defaultAppState = {
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

// GET

export const getRideRows = (appState) => appState.rides.map(obj => [obj.ride, obj.time]);
export const getRides = (appState) => appState.rides.map(obj => obj.ride);
export const getWorkers = (appState) => appState.workers.map(obj => obj.worker);
export const getRidecheckDays = (appState) => appState.ridechecks.map(obj => obj.day);
export const getDayrestrictDays = (appState) => appState.dayrestrict.map(obj => obj.day);
export const getRidecheckHeader = (appState) => ['Ride'].concat(getRidecheckDays(appState));

// Worker rows have "worker", "checkbox1", ... "checkboxN".
export const getWorkerRows = (appState) => appState.workers.map(({worker, canCheck}) => {
    const rides = getRides(appState)
    const rideBools = rides.map(ride => canCheck.includes(ride))
    return [worker].concat(rideBools);
});

export const getDayrestrictRows = (appState) => 
    appState.dayrestrict.map(obj => [
        obj.day,
        obj.time,
        {allset: getWorkers(appState), subset: obj.absentWorkers},
        {allset: getRides(appState), subset: obj.closedRides}
    ]);

export function getRidecheckRows(appState) {
    const rows = [];
    const ridecheckDays = getRidecheckDays(appState);
    for (const ride of getRides(appState)) {
        const row = [ride];
        for (const day of ridecheckDays) {
            const obj = appState.ridechecks.find(obj => obj.day === day);
            row.push(obj.ridecheck[ride] ?? "CLOSED");
        }
        rows.push(row);
    }
    return rows;
}

// SET

export function setRideRows(rows, setAppState) {
    setAppState(appState => {
        const rideObjs = rows.map(([ride, time]) => ({ride, time}));
        const rideOk = (ride) => rideObjs.some(rideObj => rideObj.ride === ride);
        const workerObjs = appState.workers.map(({worker, canCheck}) => ({worker, canCheck: canCheck.filter(rideOk)}));
        const dayrestrictObjs = appState.dayrestrict.map(dayrestrictObj => ({
            ...dayrestrictObj,
            closedRides: dayrestrictObj.closedRides.filter(rideOk)
        }));
        return {
            ...appState,
            rides: rideObjs,
            workers: workerObjs,
            dayrestrict: dayrestrictObjs
        };
    });
}

export function setWorkerRows(rows, setAppState) {
    setAppState((appState) => {
        const rides = getRides(appState);

        // Convert workerRows to array of {worker: ..., canCheck: ...} objects.
        const workerObjs = rows.map(([worker, ...rideBools]) => {
            const canCheck = rideBools
                .map((rideBool, rideIdx) => (rideBool ? rides[rideIdx] : null))
                .filter(Boolean); // Remove null values
            return { worker, canCheck };
        });

        const workerOk = (worker) => workerObjs.some(workerObj => workerObj.worker === worker)
        
        // Update dayrestrict to remove non-existent workers.
        const dayrestrictObjs = appState.dayrestrict.map((obj) => ({...obj, absentWorkers: obj.absentWorkers.filter(workerOk)}));

        return {
            ...appState,
            workers: workerObjs,
            dayrestrict: dayrestrictObjs,
        };
    });
}

export function setDayrestrictRows(rows, setAppState) {
    setAppState((currentState) => ({
        ...currentState,
        dayrestrict: rows.map(([day, time, absentWorkersObj, closedRidesObj]) => ({
            day,
            time,
            absentWorkers: absentWorkersObj.subset,
            closedRides: closedRidesObj.subset,
        })),
    }));
}

export function setRidechecks(newRidechecks, setAppState) {
    setAppState((state) => ({...state, ridechecks: newRidechecks}));
}
