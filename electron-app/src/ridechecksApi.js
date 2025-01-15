// Ridecheck generation is done for a certain day,
// and we need to filter out closedRides and absentWorkers,
// i.e. apply the day restrictions.
function applyDayRestrict(appState, day) {
    const {time, closedRides, absentWorkers} = appState.dayrestrict.find(obj => obj.day === day);
    const problemData = {
        rides: appState.rides.filter(obj => !closedRides.includes(obj.ride)),
        workers: appState.workers.filter(obj => !absentWorkers.includes(obj.worker)) // Remove workers that are absent.
            .map(obj => ({...obj, canCheck: obj.canCheck.filter(ride => !closedRides.includes(ride))})), // Remove rides that are closed.
        total_time: time
    }
    return problemData;
}

// `problemData` is for one specific day, as is a ridecheck.
// Called multiple times in fetchAllRidechecks.
async function fetchRidecheck(problemData) {
    // Needed to set Access-Control-Allow-Origin to * in AWS console in order to make this work.
    const url = "https://grhg6g6d90.execute-api.us-west-2.amazonaws.com/ridecheck_generator";
    const options = {
        'method': 'POST',
        'headers': {
            'Content-Type': 'application/json',
        },
        'body': JSON.stringify(problemData)
    };
    const response = await fetch(url, options);
    const json = await response.json();
    return json;
}

// Returns either an error string or ridechecks, which is {day: "...", ridecheck: {...} }[].
export default async function fetchAllRidechecks(appState) {
    const days = appState.dayrestrict.map(obj => obj.day);
    const promises = days.map(day => {
        const problemData = applyDayRestrict(appState, day);
        return fetchRidecheck(problemData);
    });
    
    /**
     * Each promise resolves to a {status: ..., result: ...} object.
     * Status is a string that is either 
     *  'did generate' OR 
     *   one of three possible error strings.
     * Result is either 
     *   the ridechecks result OR
     *   a string that explains the error in more detail. 
     */
    const jsonArray = await Promise.all(promises);

    const ridechecks = [];
    const invalidDataErrors = [];
    const couldNotGenerateErrors = [];
    const unexpectedErrors = [];

    // Loop through all API responses and fill the 4 arrays above.
    for (let index = 0; index < jsonArray.length; index++) {
        const {status, result} = jsonArray[index];
        const day = days[index]
        if (status === 'did generate') {
            ridechecks.push({day, ridecheck: result})
        } else if (status === 'invalid data') {
            invalidDataErrors.push({day, error: result})
        } else if (status === 'could not generate') {
            couldNotGenerateErrors.push({day, error: result})
        } else if (status === 'unexpected error') {
            unexpectedErrors.push({day, error: result})
        } else {
            throw new Error(`api error - status ${status} is not valid - this code should never be reached`);
        }
    }

    if (ridechecks.length === days.length) { // No generation issues:
        return ridechecks;
    }

    // Generation issues exist, will return error string:

    function getErrorString(errors) {
        let errorString = '';
        for (const {day, error} of errors) {
            errorString += `${day}: ${error}\n`;
        }
        return errorString;
    }

    // Check the arrays with priority "unexpectedErrors -> invalidDataErrors -> couldNotGenerateErrors", and return appropriate error string.
    if (unexpectedErrors.length !== 0) {
        return "Generating ridechecks for the following days produced unexpected errors:\n" + getErrorString(unexpectedErrors);
    }
    if (invalidDataErrors.length !== 0) {
        return "Invalid data for the following days:\n" + getErrorString(invalidDataErrors);
    }
    if (couldNotGenerateErrors.length !== 0) {
        return "Could not generate ridechecks for the following days:\n" + getErrorString(couldNotGenerateErrors);
    }
    throw new Error("critical API failure - this code should never be reached");
}