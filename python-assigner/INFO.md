This is how you package it (copied from https://docs.aws.amazon.com/lambda/latest/dg/python-package.html#python-package-create-dependencies
)

To create the deployment package (project directory)
Navigate to the project directory containing your lambda_function.py source code file. In this example, the directory is named my_function.


`cd my_function`
Create a new directory named package into which you will install your dependencies.


`mkdir package`
Note that for a .zip deployment package, Lambda expects your source code and its dependencies all to be at the root of the .zip file. However, installing dependencies directly in your project directory can introduce a large number of new files and folders and make navigating around your IDE difficult. You create a separate package directory here to keep your dependencies separate from your source code.

Install your dependencies in the package directory. The example below installs the Boto3 SDK from the Python Package Index using pip. If your function code uses Python packages you have created yourself, save them in the package directory.


`pip install --target ./package boto3`
Create a .zip file with the installed libraries at the root.


`cd package`
`zip -r ../my_deployment_package.zip .`
This generates a my_deployment_package.zip file in your project directory.

Add the lambda_function.py file to the root of the .zip file


`cd ..`
`zip my_deployment_package.zip lambda_function.py`
