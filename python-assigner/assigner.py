import constraint as csp
from typing import List

problem_data = {
    'rides': {
        'rollercoaster': 22,
        'helevator': 10,
        'flume': 23,
        'launcher': 23,
        'carusel': 5
    }, 
    'workers': {
        'alex': ['rollercoaster', 'launcher'],
        'kennedy': ['flume', 'launcher'],
        'gio': ['rollercoaster', 'helevator', 'carusel'],
        'alexa': ['flume', 'helevator']
    },
    'total_time': 23
}

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

print(assigner(rides, times, ride_domains, workers, total_time))
