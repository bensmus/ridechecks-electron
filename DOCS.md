# Overview

This repository contains the source code for a software solution consisting of an Electron application (located in the `electron-app` folder) an associated API (located in the `python-assigner` folder) that the Electron application calls. The goal of this software is to allow its user to generate an assignment of workers to tasks.

## Basic example

Suppose this software is used by a factory manager, whose factory has 10 tasks, each taking 5 minutes, and employs 2 workers. The factory manager wants to deploy the aformentioned workers to complete all tasks in 25 minutes. The software assumes that the workers can complete tasks concurrently, and each task can be completed independently of every other task, and would therefore assign each worker to 5 tasks. This means that each worker works for 25 minutes (5 tasks * 5 minutes); together, the workers are able to complete all of the tasks in the allotted time. If the factory manager allotted 20 minutes, the software would notify the factory manager that no worker assignment is possible such that all tasks are completed in the alloted time.

## Realistic example

This software does not assume that every worker can perform every task, and features a table with checkboxes that allows the user to specify which tasks each worker can perform. 

![Worker table](screenshots/workers_table.png)

It also features a table for editing task durations.

![Ride table](screenshots/rides_table.png)

This software provides a convenience to the user: they can generate multiple assignments in one go. For example, if there are 3 timeslots during which certain tasks need to be completed, the user can specify subsets of workers and tasks for each timeslot using a table.

![Day restrictions table](screenshots/day_restrictions_table.png)

Here's the assignments that the software generates based on the information in the 3 input tables:

![Ridechecks table](screenshots/ridechecks_table.png)

# The technology stack

This software is composed of:
- The Electron application, which runs locally on the user's computer. All Electron applications run as at least two processes that communicate with each another: 
    - One main process, which has access to operating system features such as saving files to the filesystem. This process is interpreted by Node.js. 
    - At least one renderer process, which is spawned by the main process. I'm oversimplifying, but this renderer process has a mini-browser inside of it, and it understands JavaScript/HTML/CSS for browsers. In my case, I'm developing code for the renderer process using React, a very popular modern JavaScript framerwork. My main process only spawns one renderer process, since the application only needs one window, and does not require any web-based background tasks.
- An AWS Lambda triggered via  AWS API Gateway, which runs on Amazon's servers. The Lambda computes the assignment by using the  [python-constraint](https://github.com/python-constraint/python-constraint) module, specifically the `MinConflictsSolver` class.

## The Electron application 

I decided to use Electron for the user interface of the application, although an early version used PyQt. Using Electron means that you can use all the latest and greatest web frameworks, such as React. In my opinion, React's state-based mechanism is easier to work with than PyQt's signal/slot mechanism in the context of my application. I think that using Svelte would have been even easier, but I needed to review React since it is still more common in the industry. 

To setup the boilerplate for the Electron application, I followed instructions from https://mmazzarolo.com/blog/2021-08-12-building-an-electron-application-using-create-react-app/. 

That blog describes how to modify source code for a web application in order to use it in an Electron desktop application. The blog mainly helped me to:
- Add code (`electron-app/public/main.js`) which implements the Electron main process.
- Add code (`electron-app/public/preload.js`) which specifies  how the Electron main process can communicate with the renderer process. This is described as an optional step in the blog, but has become a mandatory step since the blog's publication due to stricter security enforcement in the new Electron version.
- Run and package the Electron app by installing the necessary packages and updating the `electron-app/package.json`.