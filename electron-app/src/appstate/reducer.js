import { rides as selectRides} from './selectors'

export default function reducer(draft, action) {
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
            const workerNames = new Set(workerObjs.map(workerObj => workerObj.worker));
            // Update dayrestrict.absentWorkers array,
            // ensure that it contains only workers that actually exist.
            for (const obj of draft.dayrestrict) {
                obj.absentWorkers = obj.absentWorkers.filter(workerName => workerNames.has(workerName));
            }
            break;
        case "set-rides":
            draft.rides = action.payload.map(([ride, time]) => ({ride, time}));
            const rideNames = new Set(draft.rides.map(rideObj => rideObj.ride));
            // Update worker.canCheck array and dayrestrict.closedRides array,
            // ensure that they contain only rides that actually exist.
            for (const obj of draft.workers) {
                obj.canCheck = obj.canCheck.filter(rideName => rideNames.has(rideName));
            }
            for (const obj of draft.dayrestrict) {
                obj.closedRides = obj.closedRides.filter(rideName => rideNames.has(rideName));
            }
            break;
        default:
            throw new Error(`Invalid action type: ${action.type}`);
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
