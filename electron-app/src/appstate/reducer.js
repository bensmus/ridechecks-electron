import { rides as selectRides} from './selectors'

export default function reducer(draft, action) {
    // eslint-disable-next-line default-case
    switch (action.type) {
        case "set-state":
            return action.payload;

        // In all following cases, action.payload is a 2D array,
        // rows coming from EditableTable.
        case "set-ridechecks":
            draft.ridechecks = action.payload;
            break;
        case "set-dayrestrict":
            draft.dayrestrict = action.payload.map(([day, time, absentWorkersObj, closedRidesObj]) => ({
                day,
                time,
                absentWorkers: absentWorkersObj.subset,
                closedRides: closedRidesObj.subset,
            }));
            break;
        case "set-workers":
            const rides = selectRides(draft);
            const workerObjs = workerObjsFromRows(rides, action.payload);
            draft.workers = workerObjs;
            const workerOk = (worker) => workerObjs.some(workerObj => workerObj.worker === worker)
            for (const obj of draft.dayrestrict) {
                obj.absentWorkers = obj.absentWorkers.filter(workerOk)
            }
            break;
        case "set-rides":
            draft.rides = action.payload.map(([ride, time]) => ({ride, time}));
            const rideOk = (ride) => draft.rides.some(rideObj => rideObj.ride === ride);
            for (const obj of draft.workers) {
                obj.canCheck = obj.canCheck.filter(rideOk);
            }
            for (const obj of draft.dayrestrict) {
                obj.closedRides = obj.closedRides.filter(rideOk);
            }
    }
}

function workerObjsFromRows(rides, workerRows) {
    // Convert workerRows to array of {worker: ..., canCheck: ...} objects.
    return workerRows.map(([worker, ...rideBools]) => {
        // `canCheck` is an array of ride names.
        const canCheck = rideBools
            .map((rideBool, rideIdx) => (rideBool ? rides[rideIdx] : null))
            .filter(Boolean); // Remove null values.
        return { worker, canCheck };
    });
}
