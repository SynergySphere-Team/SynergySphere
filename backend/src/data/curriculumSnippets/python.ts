import type { ExampleSnippet } from './types.js';

export function getPythonExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  if (/home|intro/.test(t)) {
    return {
      title: 'Python print() Output',
      language: 'python',
      code: 'print("Hello, World!")',
      explanation: 'The classic introductory example from W3Schools Python tutorial.\n\nExpected Output:\nHello, World!',
      syntax: ['print(value)']
    };
  }
  if (/get started|version/.test(t)) {
    return {
      title: 'Check Python Version',
      language: 'python',
      code: 'import sys\nprint(sys.version)',
      explanation: 'W3Schools example demonstrating how to inspect the active Python runtime version.\n\nExpected Output:\n3.12.x (active Python interpreter version)',
      syntax: ['import sys', 'sys.version']
    };
  }
  if (/syntax|statement/.test(t)) {
    return {
      title: 'Python Indentation Syntax',
      language: 'python',
      code: 'if 5 > 2:\n    print("Five is greater than two!")',
      explanation: 'Python uses indentation to indicate a block of code, unlike languages using curly brackets.\n\nExpected Output:\nFive is greater than two!',
      syntax: ['if condition:', '    statement']
    };
  }
  if (/comment/.test(t)) {
    return {
      title: 'Python Comments',
      language: 'python',
      code: '# This is a single-line comment\nprint("Comments are ignored by Python")\n"""\nThis is a multiline\nstring used as a comment\n"""',
      explanation: 'Comments start with a hash symbol (#) and Python will ignore them when running code.\n\nExpected Output:\nComments are ignored by Python',
      syntax: ['# comment text', '""" multiline comment """']
    };
  }
  if (/variable/.test(t)) {
    return {
      title: 'Python Variables & Assignment',
      language: 'python',
      code: 'x = 5\ny = "John"\nprint(x)\nprint(y)',
      explanation: 'Variables are containers for storing data values. In Python, variables are created when you assign a value to them.\n\nExpected Output:\n5\nJohn',
      syntax: ['variable_name = value']
    };
  }
  if (/data type/.test(t)) {
    return {
      title: 'Getting the Data Type',
      language: 'python',
      code: 'x = 5\ny = "Hello"\nz = [1, 2, 3]\nprint(type(x))\nprint(type(y))\nprint(type(z))',
      explanation: 'You can get the data type of any object by using the type() function.\n\nExpected Output:\n<class \'int\'>\n<class \'str\'>\n<class \'list\'>',
      syntax: ['type(object)']
    };
  }
  if (/number/.test(t)) {
    return {
      title: 'Python Numbers',
      language: 'python',
      code: 'x = 1    # int\ny = 2.8  # float\nz = 1j   # complex\nprint(type(x))\nprint(type(y))\nprint(type(z))',
      explanation: 'There are three numeric types in Python: int, float, and complex.\n\nExpected Output:\n<class \'int\'>\n<class \'float\'>\n<class \'complex\'>',
      syntax: ['x = 1', 'y = 2.8', 'z = 1j']
    };
  }
  if (/cast/.test(t)) {
    return {
      title: 'Python Type Casting',
      language: 'python',
      code: 'x = int(1)\ny = int(2.8)\nz = float("3")\nw = str(4.2)\nprint(x, y, z, w)',
      explanation: 'Casting in Python is done using constructor functions like int(), float(), and str().\n\nExpected Output:\n1 2 3.0 4.2',
      syntax: ['int(value)', 'float(value)', 'str(value)']
    };
  }
  if (/string/.test(t)) {
    return {
      title: 'Python Strings & Slicing',
      language: 'python',
      code: 'a = "Hello, World!"\nprint(a[1])\nprint(a[2:5])\nprint(len(a))\nprint(a.upper())',
      explanation: 'Strings in Python are arrays of bytes representing unicode characters.\n\nExpected Output:\ne\nllo\n13\nHELLO, WORLD!',
      syntax: ['string[index]', 'string[start:end]', 'len(string)']
    };
  }
  if (/boolean/.test(t)) {
    return {
      title: 'Python Booleans',
      language: 'python',
      code: 'print(10 > 9)\nprint(10 == 9)\nprint(10 < 9)\nprint(bool("Hello"))',
      explanation: 'Booleans represent one of two values: True or False.\n\nExpected Output:\nTrue\nFalse\nFalse\nTrue',
      syntax: ['bool(expression)', 'a == b', 'a > b']
    };
  }
  if (/operator/.test(t)) {
    return {
      title: 'Python Arithmetic Operators',
      language: 'python',
      code: 'x = 10\ny = 3\nprint("Add:", x + y)\nprint("Multiply:", x * y)\nprint("Floor Div:", x // y)\nprint("Modulus:", x % y)',
      explanation: 'Operators are used to perform operations on variables and values.\n\nExpected Output:\nAdd: 13\nMultiply: 30\nFloor Div: 3\nModulus: 1',
      syntax: ['+', '-', '*', '/', '//', '%', '**']
    };
  }
  if (/list/.test(t)) {
    return {
      title: 'Python Lists',
      language: 'python',
      code: 'thislist = ["apple", "banana", "cherry"]\nthislist.append("orange")\nprint(thislist)\nprint("Length:", len(thislist))\nprint("First item:", thislist[0])',
      explanation: 'Lists are used to store multiple items in a single variable. Lists are ordered, changeable, and allow duplicate values.\n\nExpected Output:\n[\'apple\', \'banana\', \'cherry\', \'orange\']\nLength: 4\nFirst item: apple',
      syntax: ['list_name = [item1, item2]', 'list_name.append(new_item)']
    };
  }
  if (/tuple/.test(t)) {
    return {
      title: 'Python Tuples',
      language: 'python',
      code: 'thistuple = ("apple", "banana", "cherry")\nprint(thistuple)\nprint("Length:", len(thistuple))\nprint("Item at index 1:", thistuple[1])',
      explanation: 'Tuples are used to store multiple items in a single variable. A tuple is a collection which is ordered and unchangeable.\n\nExpected Output:\n(\'apple\', \'banana\', \'cherry\')\nLength: 3\nItem at index 1: banana',
      syntax: ['tuple_name = (item1, item2)', 'tuple_name[index]']
    };
  }
  if (/set\b/.test(t)) {
    return {
      title: 'Python Sets',
      language: 'python',
      code: 'thisset = {"apple", "banana", "cherry"}\nthisset.add("orange")\nprint("banana in set?", "banana" in thisset)\nprint("Set size:", len(thisset))',
      explanation: 'Sets are used to store multiple items in a single variable. A set is a collection which is unordered, unchangeable, and unindexed.\n\nExpected Output:\nbanana in set? True\nSet size: 4',
      syntax: ['set_name = {item1, item2}', 'set_name.add(item)']
    };
  }
  if (/dict/.test(t)) {
    return {
      title: 'Python Dictionaries',
      language: 'python',
      code: 'thisdict = {\n    "brand": "Ford",\n    "model": "Mustang",\n    "year": 1964\n}\nprint(thisdict["brand"])\nprint("Keys:", list(thisdict.keys()))',
      explanation: 'Dictionaries are used to store data values in key:value pairs. A dictionary is a collection which is ordered, changeable and does not allow duplicates.\n\nExpected Output:\nFord\nKeys: [\'brand\', \'model\', \'year\']',
      syntax: ['dict_name = {key: value}', 'dict_name[key]']
    };
  }
  if (/if\.\.\.else|if else|conditional/.test(t)) {
    return {
      title: 'Python If...Else Statements',
      language: 'python',
      code: 'a = 200\nb = 33\nif b > a:\n    print("b is greater than a")\nelif a == b:\n    print("a and b are equal")\nelse:\n    print("a is greater than b")',
      explanation: 'Python conditions and If statements rely on indentation to define scope.\n\nExpected Output:\na is greater than b',
      syntax: ['if condition:', '    statement', 'elif condition:', '    statement', 'else:', '    statement']
    };
  }
  if (/while/.test(t)) {
    return {
      title: 'Python While Loops',
      language: 'python',
      code: 'i = 1\nwhile i < 6:\n    print(i)\n    i += 1',
      explanation: 'With the while loop we can execute a set of statements as long as a condition is true.\n\nExpected Output:\n1\n2\n3\n4\n5',
      syntax: ['while condition:', '    statement', '    increment']
    };
  }
  if (/for loop|for/.test(t)) {
    return {
      title: 'Python For Loops',
      language: 'python',
      code: 'fruits = ["apple", "banana", "cherry"]\nfor x in fruits:\n    print(x)\nfor i in range(3):\n    print("Index:", i)',
      explanation: 'A for loop is used for iterating over a sequence (that is either a list, a tuple, a dictionary, a set, or a string).\n\nExpected Output:\napple\nbanana\ncherry\nIndex: 0\nIndex: 1\nIndex: 2',
      syntax: ['for item in sequence:', '    statement']
    };
  }
  if (/function/.test(t)) {
    return {
      title: 'Python Functions',
      language: 'python',
      code: 'def my_function(fname, lname="Smith"):\n    return f"Hello, {fname} {lname}"\n\nmessage = my_function("Emil")\nprint(message)',
      explanation: 'A function is a block of code which only runs when it is called. You can pass data, known as parameters, into a function.\n\nExpected Output:\nHello, Emil Smith',
      syntax: ['def function_name(param):', '    return result']
    };
  }
  if (/lambda/.test(t)) {
    return {
      title: 'Python Lambda Functions',
      language: 'python',
      code: 'x = lambda a, b: a * b\nprint("Product:", x(5, 6))\n\ndef myfunc(n):\n    return lambda a: a * n\n\nmydoubler = myfunc(2)\nprint("Doubled:", mydoubler(11))',
      explanation: 'A lambda function is a small anonymous function. A lambda function can take any number of arguments, but can only have one expression.\n\nExpected Output:\nProduct: 30\nDoubled: 22',
      syntax: ['lambda arguments: expression']
    };
  }
  if (/class|oop/.test(t)) {
    return {
      title: 'Python Classes and Objects',
      language: 'python',
      code: 'class Person:\n    def __init__(self, name, age):\n        self.name = name\n        self.age = age\n\n    def introduce(self):\n        print(f"Hello, my name is {self.name} and I am {self.age}")\n\np1 = Person("John", 36)\np1.introduce()',
      explanation: 'Python is an object oriented programming language. Almost everything in Python is an object, with its properties and methods.\n\nExpected Output:\nHello, my name is John and I am 36',
      syntax: ['class ClassName:', '    def __init__(self, params):', '        self.prop = val']
    };
  }
  if (/inherit/.test(t)) {
    return {
      title: 'Python Class Inheritance',
      language: 'python',
      code: 'class Person:\n    def __init__(self, fname, lname):\n        self.firstname = fname\n        self.lastname = lname\n\n    def printname(self):\n        print(self.firstname, self.lastname)\n\nclass Student(Person):\n    pass\n\nx = Student("Mike", "Olsen")\nx.printname()',
      explanation: 'Inheritance allows us to define a class that inherits all the methods and properties from another class.\n\nExpected Output:\nMike Olsen',
      syntax: ['class ParentClass:', 'class ChildClass(ParentClass):']
    };
  }
  if (/iterator/.test(t)) {
    return {
      title: 'Python Iterators',
      language: 'python',
      code: 'mytuple = ("apple", "banana", "cherry")\nmyit = iter(mytuple)\nprint(next(myit))\nprint(next(myit))\nprint(next(myit))',
      explanation: 'An iterator is an object that contains a countable number of values that can be iterated upon using iter() and next().\n\nExpected Output:\napple\nbanana\ncherry',
      syntax: ['iter_obj = iter(iterable)', 'next(iter_obj)']
    };
  }
  if (/scope/.test(t)) {
    return {
      title: 'Python Variable Scope',
      language: 'python',
      code: 'x = 300  # Global scope\n\ndef myfunc():\n    global x\n    x = 200  # Modifying global\n    print("Inside:", x)\n\nmyfunc()\nprint("Outside:", x)',
      explanation: 'A variable created inside a function belongs to the local scope of that function. The global keyword binds to the module scope.\n\nExpected Output:\nInside: 200\nOutside: 200',
      syntax: ['global variable_name']
    };
  }
  if (/module|pip/.test(t)) {
    return {
      title: 'Python Modules',
      language: 'python',
      code: 'import math\n\nprint("Square root of 64:", math.sqrt(64))\nprint("Pi value:", round(math.pi, 4))',
      explanation: 'Consider a module to be the same as a code library. A file containing a set of functions you want to include in your application.\n\nExpected Output:\nSquare root of 64: 8.0\nPi value: 3.1416',
      syntax: ['import module_name', 'from module_name import function']
    };
  }
  if (/date/.test(t)) {
    return {
      title: 'Python Datetime',
      language: 'python',
      code: 'import datetime\n\nx = datetime.datetime.now()\nprint("Year:", x.year)\nprint("Weekday:", x.strftime("%A"))',
      explanation: 'A date in Python is not a data type of its own, but we can import the datetime module to work with dates as date objects.\n\nExpected Output:\nYear: (current year)\nWeekday: (current weekday name)',
      syntax: ['import datetime', 'datetime.datetime.now()']
    };
  }
  if (/math/.test(t)) {
    return {
      title: 'Python Math Functions',
      language: 'python',
      code: 'import math\n\nprint("Min:", min(5, 10, 25))\nprint("Max:", max(5, 10, 25))\nprint("Ceil of 1.4:", math.ceil(1.4))\nprint("Floor of 1.4:", math.floor(1.4))',
      explanation: 'Python has a set of built-in math functions, and an extensive math module that allows you to perform mathematical tasks on numbers.\n\nExpected Output:\nMin: 5\nMax: 25\nCeil of 1.4: 2\nFloor of 1.4: 1',
      syntax: ['min(values)', 'max(values)', 'math.ceil(x)', 'math.floor(x)']
    };
  }
  if (/json/.test(t)) {
    return {
      title: 'Python JSON Parsing',
      language: 'python',
      code: 'import json\n\n# JSON string to Python dictionary\nx = \'{"name":"John", "age":30, "city":"New York"}\'\ny = json.loads(x)\nprint("Name:", y["name"])\n\n# Python dictionary to JSON string\nz = json.dumps({"brand": "Ford", "electric": False})\nprint("JSON output:", z)',
      explanation: 'Python has a built-in package called json, which can be used to parse and encode JSON data.\n\nExpected Output:\nName: John\nJSON output: {"brand": "Ford", "electric": false}',
      syntax: ['json.loads(json_string)', 'json.dumps(python_object)']
    };
  }
  if (/regex|regular expression/.test(t)) {
    return {
      title: 'Python RegEx',
      language: 'python',
      code: 'import re\n\ntxt = "The rain in Spain"\nx = re.findall("ai", txt)\nprint("Matches found:", x)\n\nmatch = re.search("^The.*Spain$", txt)\nprint("Full match?", bool(match))',
      explanation: 'A RegEx, or Regular Expression, is a sequence of characters that forms a search pattern.\n\nExpected Output:\nMatches found: [\'ai\', \'ai\']\nFull match? True',
      syntax: ['import re', 're.findall(pattern, string)', 're.search(pattern, string)']
    };
  }
  if (/try|except|error/.test(t)) {
    return {
      title: 'Python Try...Except Blocks',
      language: 'python',
      code: 'try:\n    print(undeclared_variable)\nexcept NameError:\n    print("Variable is not defined")\nexcept Exception as err:\n    print("Something else went wrong:", err)\nfinally:\n    print("The try-except block finished")',
      explanation: 'The try block lets you test a block of code for errors. The except block lets you handle the error. The finally block executes regardless.\n\nExpected Output:\nVariable is not defined\nThe try-except block finished',
      syntax: ['try:', '    statement', 'except ExceptionType:', '    handle_error', 'finally:', '    cleanup']
    };
  }
  if (/user input|input/.test(t)) {
    return {
      title: 'Python User Input',
      language: 'python',
      code: 'username = input("Enter username: ")\nprint("Username is: " + username)',
      explanation: 'Python allows for user input. That means we are able to ask the user for input using the input() built-in method.\n\nExpected Output:\nEnter username: (input string)\nUsername is: (input string)',
      syntax: ['variable = input(prompt_string)']
    };
  }
  if (/file/.test(t)) {
    return {
      title: 'Python File Handling',
      language: 'python',
      code: 'with open("demofile.txt", "w") as f:\n    f.write("Now the file has more content!")\n\nwith open("demofile.txt", "r") as f:\n    content = f.read()\n    print(content)',
      explanation: 'The key function for working with files in Python is the open() function. Using with open ensures resources are closed automatically.\n\nExpected Output:\nNow the file has more content!',
      syntax: ['with open(filename, mode) as f:', '    f.write(text)', '    f.read()']
    };
  }
  if (/numpy/.test(t)) {
    return {
      title: 'NumPy Arrays',
      language: 'python',
      code: 'import numpy as np\n\narr = np.array([1, 2, 3, 4, 5])\nprint("Array:", arr)\nprint("Dimensions:", arr.ndim)\nprint("Type:", type(arr))',
      explanation: 'NumPy is a Python library used for working with arrays. It also has functions for working in domain of linear algebra and matrices.\n\nExpected Output:\nArray: [1 2 3 4 5]\nDimensions: 1\nType: <class \'numpy.ndarray\'>',
      syntax: ['import numpy as np', 'arr = np.array(list)']
    };
  }
  if (/pandas/.test(t)) {
    return {
      title: 'Pandas DataFrames',
      language: 'python',
      code: 'import pandas as pd\n\ndata = {\n    "calories": [420, 380, 390],\n    "duration": [50, 40, 45]\n}\ndf = pd.DataFrame(data)\nprint(df)',
      explanation: 'Pandas is a Python library used for working with data sets. It has functions for analyzing, cleaning, exploring, and manipulating data.\n\nExpected Output:\n   calories  duration\n0       420        50\n1       380        40\n2       390        45',
      syntax: ['import pandas as pd', 'df = pd.DataFrame(data_dict)']
    };
  }
  if (/mysql/.test(t)) {
    return {
      title: 'Python MySQL Connection',
      language: 'python',
      code: 'import mysql.connector\n\nmydb = mysql.connector.connect(\n    host="localhost",\n    user="yourusername",\n    password="yourpassword"\n)\nprint("MySQL connection established:", bool(mydb))',
      explanation: 'Python can be used in database applications. One of the most popular databases is MySQL using mysql.connector.\n\nExpected Output:\nMySQL connection established: True',
      syntax: ['import mysql.connector', 'mydb = mysql.connector.connect(...)']
    };
  }
  if (/mongodb/.test(t)) {
    return {
      title: 'Python MongoDB Connection',
      language: 'python',
      code: 'import pymongo\n\nmyclient = pymongo.MongoClient("mongodb://localhost:27017/")\nmydb = myclient["mydatabase"]\nprint("Databases:", myclient.list_database_names())',
      explanation: 'MongoDB stores data in JSON-like documents, which makes the database very flexible and scalable using the pymongo driver.\n\nExpected Output:\nDatabases: [\'admin\', \'config\', \'local\']',
      syntax: ['import pymongo', 'client = pymongo.MongoClient(uri)']
    };
  }

  return {
    title: 'Python Statement Execution',
    language: 'python',
    code: 'x = 10\ny = 20\nprint("Calculated result:", x + y)',
    explanation: 'Demonstrates execution of the Python statement and standard console output.\n\nExpected Output:\nCalculated result: 30',
    syntax: ['print(expression)']
  };
}
