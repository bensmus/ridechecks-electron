all: 
	mkdir package
	pip install --target ./package python-constraint
	cd package && zip -r ../my_deployment_package.zip .
	zip my_deployment_package.zip lambda_function.py
