from lambda_function import ridecheck_generator

# Scenario where ride_domain would be empty for helevator.
problem_data = {
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

print(ridecheck_generator(problem_data))