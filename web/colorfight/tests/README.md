# Tests 

## Installation
The coverage tool should have been installed previously when install the requirements.txt file.
If not, the simplest way is with pip
```
$ pip install coverage
```

## Execution
When running the test code, use the following command 
```
$ coverage run -m pytest test_file_name
```
Your program runs just as if it had been invoked with the Python command line.
The -m flag shows the line numbers of missing statements.
If you want branch coverage measurement, use the --branch flag. 
Otherwise only statement coverage is measured.

## Data file
Coverage.py collects execution data in a file called ”.coverage”.
By default, each run of your program starts with an empty data set.
To erase the collected data, use the erase command:
```
$ coverage erase
```

## Reporting
Coverage.py can annotate your source code for which lines were executed and which were not. 
The html command creates an HTML report similar to the report summary, but as an HTML file. 
Each module name links to the source file decorated to show the status of each line.
For example, if you prefer a style of HTML report, the following command 

```
$ coverage html
```
specifies an output directory defaulting to “htmlcov”.
You will be able to see all your html report in that directory.
