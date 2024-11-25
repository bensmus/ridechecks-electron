import constraint as csp

rides = {
    'helevator': {
        'time': 10,
        'workers': ['charlie', 'josh']
    },
    'roller': {
        'time': 20,
        'workers': ['josh']
    },
    'carusel': {
        'time': 5,
        'workers': ['charlie']
    },
    'flume': {
        'time': 30,
        'workers': ['charlie', 'josh', 'terry']
    }
}

def assigner(rides, total_time):
    problem = csp.Problem(csp.MinConflictsSolver())
    all_workers = set()
    for ride in rides:
        workers = rides[ride]['workers']
        problem.addVariable(ride, workers)
        all_workers.update(workers)
    ...