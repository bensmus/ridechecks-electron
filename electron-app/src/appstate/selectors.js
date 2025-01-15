export const rideRows = (appState) => appState.rides.map(obj => [obj.ride, obj.time]);
export const rides = (appState) => appState.rides.map(obj => obj.ride);
export const workers = (appState) => appState.workers.map(obj => obj.worker);
export const ridecheckDays = (appState) => appState.ridechecks.map(obj => obj.day);
export const dayrestrictDays = (appState) => appState.dayrestrict.map(obj => obj.day);
export const ridecheckHeader = (appState) => ['Ride'].concat(ridecheckDays(appState));

// Worker rows have "worker", "checkbox1", ... "checkboxN".
export const workerRows = (appState) => appState.workers.map(({worker, canCheck}) => {
    const rides_ = rides(appState)
    const rideBools = rides_.map(ride => canCheck.includes(ride))
    return [worker].concat(rideBools);
});

export const dayrestrictRows = (appState) => 
    appState.dayrestrict.map(obj => [
        obj.day,
        obj.time,
        {allset: workers(appState), subset: obj.absentWorkers},
        {allset: rides(appState), subset: obj.closedRides}
    ]);

export function ridecheckRows(appState) {
    const rows = [];
    const ridecheckDays_ = ridecheckDays(appState);
    for (const ride of rides(appState)) {
        const row = [ride];
        for (const day of ridecheckDays_) {
            const obj = appState.ridechecks.find(obj => obj.day === day);
            row.push(obj.ridecheck[ride] ?? "CLOSED");
        }
        rows.push(row);
    }
    return rows;
}