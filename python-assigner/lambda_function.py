import constraint as csp
import json
from typing import List


def ridecheck_generator(problem_data):
    def workers_that_can_check(ride, worker_permissions):
        domain = []
        for worker in worker_permissions:
            if ride in worker_permissions[worker]:
                domain.append(worker)
        return domain

    rides = list(problem_data['rides'].keys())
    times = list(problem_data['rides'].values())
    ride_domains = [workers_that_can_check(ride, problem_data['workers']) for ride in rides]
    workers = list(problem_data['workers'].keys())
    total_time = problem_data['total_time']
    
    # If domain is empty, a ridecheck is impossible.
    if any(map(lambda domain: domain == [], ride_domains)):
        return None
    
    # If any ride takes longer to check than total_time, a ridecheck is impossible.
    if any(map(lambda time: time > total_time, times)):
        return None

    # If the sum of the ride times, perfectly distributed to the workers 
    # is greater total_time, a ridecheck is impossible.
    if sum(times) / len(workers) > total_time:
        return None
    
    def assigner(
            rides: List[str], 
            times: List[int], 
            ride_domains: List[List[str]], 
            workers: List[str], 
            total_time: int):
        assert len(rides) == len(times) and len(rides) == len(ride_domains), 'invalid arguments'
        problem = csp.Problem(csp.MinConflictsSolver())
        for i, ride in enumerate(rides):
            problem.addVariable(ride, ride_domains[i])
        
        def make_worker_constraint(target_worker: str):
            # worker_constraint makes sure that the worker has enough
            # time to check all of the rides.
            def worker_constraint(*solution) -> bool:
                # Solution is a list of workers, where the index tells you 
                # which ride they check.
                target_worker_time = 0
                for i, worker in enumerate(solution):
                    if worker == target_worker:
                        ride_time = times[i]
                        target_worker_time += ride_time
                return target_worker_time <= total_time
            return worker_constraint
        
        for target_worker in workers:
            problem.addConstraint(make_worker_constraint(target_worker), rides)
        return problem.getSolution()
    return assigner(rides, times, ride_domains, workers, total_time)


def lambda_handler(event, context):
    try:
        # Parse JSON from the HTTP request body.
        # Note: event and body are plain Python dictionaries.
        problem_data = json.loads(event.get("body", "{}"))

        # Ensure that all of the necessary data is provided to generate ridechecks:
        missing_keys = [key for key in ["rides", "workers", "total_time"] if key not in problem_data]
        if missing_keys:
            raise ValueError(f"Missing required keys: {', '.join(missing_keys)}")
    
        ridecheck = ridecheck_generator(problem_data)

        # Construct the response
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json"
            },
            "body": json.dumps({'success': True, 'ridecheck': ridecheck})
        }
    except Exception as e:
        return {
            "statusCode": 400,
            "headers": {
                "Content-Type": "application/json"
            },
            "body": json.dumps({'success': False, "error": str(e)})
        }