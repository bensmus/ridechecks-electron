from lambda_function import ridecheck_generator

# Scenario where ride_domain would be empty for helevator.
problem_data_1 = {
    "rides": {
        "rollercoaster": 22,
        "helevator": 10,
        "flume": 13,
        "launcher": 25
    },
    "workers": {
        "alex": ['rollercoaster', 'launcher'],
        "kennedy": ['flume', 'launcher'],
        "gio": ['rollercoaster'],
        "alexa": ['flume']
    },
    "total_time": 100
}

print(ridecheck_generator(problem_data_1))

# Scenario where there isn't enough time.
problem_data_2 = {
    "rides": {
        "rollercoaster": 22,
        "helevator": 10,
        "flume": 13,
        "launcher": 25
    },
    "workers": {
        "alex": ['rollercoaster', 'launcher'],
        "kennedy": ['flume', 'launcher'],
        "gio": ['rollercoaster'],
        "alexa": ['flume', 'helevator']
    },
    "total_time": 2
}

print(ridecheck_generator(problem_data_2))