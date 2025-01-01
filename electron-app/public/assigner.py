# # To test (inside public folder): 
# # python3 assigner.py ./python-package < assigner_test_file.json

# import sys
# sys.path.append(sys.argv[1]) # Specify directory with csp package.
# import constraint as csp # type: ignore
import json
# from typing import List


# def data_validator(rides, times, workers, workers_rides, total_time):
#     # Check rides: all elements must be nonempty strings
#     if not all(isinstance(ride, str) and ride for ride in rides):
#         return False, "Invalid rides: all rides must have a name"
    
#     if len(set(workers)) != len(workers):
#         return False, "Invalid workers: duplicate worker name"
    
#     if len(set(rides)) != len(rides):
#         return False, "Invalid rides: duplicate ride name"
    
#     # Check times: all elements must be nonzero integers
#     if not all(isinstance(time, int) and time != 0 for time in times):
#         return False, "Invalid ride time: checking ride must take more than 0 minutes"

#     # Check workers: all elements must be nonempty strings
#     if not all(isinstance(worker, str) and worker for worker in workers):
#         return False, "Invalid workers: all workers must have a name"

#     # Check workers_rides: must be a 2D list where each element is a list of nonempty strings
#     if not isinstance(workers_rides, list) or not all(
#         isinstance(sublist, list) and all(isinstance(wr, str) and wr for wr in sublist)
#         for sublist in workers_rides
#     ):
#         return False, "Invalid workers_rides: must be a 2D list where each inner list contains nonempty strings"

#     # Check total_time: must be a nonzero integer
#     if not isinstance(total_time, int) or total_time == 0:
#         return False, "Invalid time till opening: it must be more than 0 minutes"

#     return True, "Valid data"


# def ridecheck_generator(rides, times, workers, worker_rides, total_time):
#     def compute_ride_domains(rides, workers, workers_rides):
#         ride_domains = []
#         for ride in rides:
#             ride_domain = []
#             for worker, worker_rides in zip(workers, workers_rides):
#                 if ride in worker_rides:
#                     ride_domain.append(worker)
#             ride_domains.append(ride_domain)
#         return ride_domains
    
#     ride_domains = compute_ride_domains(rides, workers, worker_rides)
    
#     for ride, time, ride_domain in zip(rides, times, ride_domains):
#         if ride_domain == []:
#             return False, f"No one is trained on {ride}"
#         if time > total_time:
#             return False, f"{ride} takes {time} minutes to check, which is more than {total_time}"

#     if sum(times) / len(workers) > total_time:
#         return False, "The ridecheck is impossible because even with an even distribution of rides, workers would not have enough time"
    
#     assert len(rides) == len(times) and len(rides) == len(ride_domains), 'Front end sent malformed data, should never happen'
#     problem = csp.Problem(csp.MinConflictsSolver())
#     for i, ride in enumerate(rides):
#         problem.addVariable(ride, ride_domains[i])
    
#     def make_worker_constraint(target_worker: str):
#         # worker_constraint makes sure that the worker has enough
#         # time to check all of the rides.
#         def worker_constraint(*solution) -> bool:
#             # Solution is a list of workers, where the index tells you 
#             # which ride they check.
#             target_worker_time = 0
#             for i, worker in enumerate(solution):
#                 if worker == target_worker:
#                     ride_time = times[i]
#                     target_worker_time += ride_time
#             return target_worker_time <= total_time
#         return worker_constraint
    
#     for target_worker in workers:
#         problem.addConstraint(make_worker_constraint(target_worker), rides)
    
#     solution = problem.getSolution()
#     if solution:
#         return True, solution
#     return False, "The ridecheck is probably impossible, maybe more workers should come in or some rides should be closed"


# def done(status, result):
#     output = {'status': status, 'result': result}
#     print(json.dumps(output))
#     exit(0)


# problem_data = json.loads(sys.stdin.read())

# status = 'unexpected error'
# result = None

# # Ensure that all of the necessary data is provided to generate ridechecks:
# missing_keys = [key for key in ["rides", "workers", "total_time"] if key not in problem_data]
# if missing_keys:
#     status = 'invalid data'
#     result = 'missing required keys'
#     done(status, result)

# rides = list(map(lambda d: d['ride'], problem_data['rides']))
# times = list(map(lambda d: d['time'], problem_data['rides']))
# workers = list(map(lambda d: d['worker'], problem_data['workers']))
# workers_rides = list(map(lambda d: d['canCheck'], problem_data['workers']))
# total_time = problem_data['total_time']

# valid_data, validator_message = data_validator(rides, times, workers, workers_rides, total_time)

# if not valid_data:
#     status = 'invalid data'
#     result = validator_message
#     done(status, result)

# did_generate, generator_output = ridecheck_generator(rides, times, workers, workers_rides, total_time)
# if not did_generate:
#     status = 'could not generate'
#     result = generator_output
#     done(status, result)
# else:
#     status = 'did generate'
#     result = generator_output
#     done(status, result)

# done(status, result)

print(json.dumps({'status': 'did generate', 'result': {'ride': 'worker'}}))