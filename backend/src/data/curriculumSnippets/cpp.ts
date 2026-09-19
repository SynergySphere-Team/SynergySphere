import type { ExampleSnippet } from './types.js';

export function getCppExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  if (/home|intro|get started/.test(t)) {
    return {
      title: 'C++ Get Started',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Hello World!";\n  return 0;\n}',
      explanation: '#include <iostream> is a header file library that lets us work with input and output objects, like cout.\n\nExpected Output:\nHello World!',
      syntax: ['#include <iostream>', 'using namespace std;', 'cout << "text";']
    };
  }
  if (/statement/.test(t)) {
    return {
      title: 'C++ Statements',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Hello World!\\n";\n  cout << "Have a good day!\\n";\n  return 0;\n}',
      explanation: 'A computer program is a list of "instructions" to be executed by a computer. In C++, each statement ends with a semicolon.\n\nExpected Output:\nHello World!\nHave a good day!',
      syntax: ['statement1;', 'statement2;']
    };
  }
  if (/output|cout/.test(t)) {
    return {
      title: 'C++ Output (cout)',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Hello World!" << endl;\n  cout << "I am learning C++";\n  return 0;\n}',
      explanation: 'The cout object, together with the << operator, is used to output values/print text. endl inserts a new line.\n\nExpected Output:\nHello World!\nI am learning C++',
      syntax: ['cout << value << endl;']
    };
  }
  if (/comment/.test(t)) {
    return {
      title: 'C++ Comments',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  // This is a single-line comment\n  cout << "Comments are ignored\\n";\n  /* Multi-line comments\n     span multiple lines */\n  return 0;\n}',
      explanation: 'Comments can be used to explain C++ code, and to make it more readable.\n\nExpected Output:\nComments are ignored',
      syntax: ['// Single-line comment', '/* Multi-line comment */']
    };
  }
  if (/user input|cin/.test(t)) {
    return {
      title: 'C++ User Input (cin)',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  int x;\n  cout << "Type a number: ";\n  cin >> x;\n  cout << "Your number is: " << x << endl;\n  return 0;\n}',
      explanation: 'cin is a predefined variable that reads data from the keyboard with the extraction operator (>>).\n\nExpected Output:\nType a number: (input number)\nYour number is: (input number)',
      syntax: ['cin >> variable;']
    };
  }
  if (/data type/.test(t)) {
    return {
      title: 'C++ Data Types',
      language: 'cpp',
      code: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n  int myNum = 5;               // Integer\n  float myFloatNum = 5.99f;    // Floating point\n  double myDoubleNum = 9.98;   // Floating point double\n  char myLetter = \'D\';         // Character\n  bool myBoolean = true;       // Boolean\n  string myText = "Hello";     // String\n  cout << myNum << " " << myFloatNum << " " << myText << endl;\n  return 0;\n}',
      explanation: 'In C++, variables must have a specified type: int, float, double, char, bool, or string.\n\nExpected Output:\n5 5.99 Hello',
      syntax: ['int i = 5;', 'double d = 9.98;', 'char c = \'A\';', 'bool b = true;']
    };
  }
  if (/variable/.test(t)) {
    return {
      title: 'C++ Variables',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  int myNum = 15;\n  myNum = 20; // myNum is now 20\n  int myOtherNum = 22;\n  cout << "Sum: " << (myNum + myOtherNum) << endl;\n  return 0;\n}',
      explanation: 'Variables are containers for storing data values. In C++, there are different types of variables.\n\nExpected Output:\nSum: 42',
      syntax: ['type variableName = value;']
    };
  }
  if (/operator/.test(t)) {
    return {
      title: 'C++ Operators',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  int sum1 = 100 + 50;\n  int sum2 = sum1 + 250;\n  int sum3 = sum2 * 2;\n  cout << "sum1: " << sum1 << ", sum2: " << sum2 << ", sum3: " << sum3 << endl;\n  return 0;\n}',
      explanation: 'Operators are used to perform operations on variables and values (+, -, *, /, %, ++, --).\n\nExpected Output:\nsum1: 150, sum2: 400, sum3: 800',
      syntax: ['int z = x + y;']
    };
  }
  if (/string/.test(t)) {
    return {
      title: 'C++ Strings & String Methods',
      language: 'cpp',
      code: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n  string greeting = "Hello";\n  cout << greeting << " has length: " << greeting.length() << "\\n";\n  cout << "First character: " << greeting[0] << "\\n";\n  string fullName = greeting + " World";\n  cout << fullName << "\\n";\n  return 0;\n}',
      explanation: 'Strings are used for storing text. A string variable contains a collection of characters surrounded by double quotes.\n\nExpected Output:\nHello has length: 5\nFirst character: H\nHello World',
      syntax: ['#include <string>', 'str.length()', 'str[0]']
    };
  }
  if (/math|cmath/.test(t)) {
    return {
      title: 'C++ Math (<cmath>)',
      language: 'cpp',
      code: '#include <iostream>\n#include <cmath>\nusing namespace std;\n\nint main() {\n  cout << "Max: " << max(5, 10) << "\\n";\n  cout << "Sqrt: " << sqrt(64) << "\\n";\n  cout << "Round: " << round(2.6) << "\\n";\n  cout << "Log: " << log(2) << "\\n";\n  return 0;\n}',
      explanation: 'C++ has many functions that allow you to perform mathematical tasks on numbers from the <cmath> library.\n\nExpected Output:\nMax: 10\nSqrt: 8\nRound: 3\nLog: 0.693147',
      syntax: ['#include <cmath>', 'sqrt(x)', 'round(x)', 'max(x, y)']
    };
  }
  if (/boolean/.test(t)) {
    return {
      title: 'C++ Booleans',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  bool isCodingFun = true;\n  bool isFishTasty = false;\n  cout << isCodingFun << "\\n"; // Outputs 1 (true)\n  cout << isFishTasty << "\\n"; // Outputs 0 (false)\n  int x = 10, y = 9;\n  cout << (x > y) << "\\n";     // Returns 1\n  return 0;\n}',
      explanation: 'A boolean variable is declared with the bool keyword and can only take the values true or false.\n\nExpected Output:\n1\n0\n1',
      syntax: ['bool myBool = true;', 'x > y']
    };
  }
  if (/if\.\.\.else|if/.test(t)) {
    return {
      title: 'C++ If...Else',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  int time = 22;\n  if (time < 10) {\n    cout << "Good morning.\\n";\n  } else if (time < 20) {\n    cout << "Good day.\\n";\n  } else {\n    cout << "Good evening.\\n";\n  }\n  return 0;\n}',
      explanation: 'Use if to specify a block of code to be executed, if a specified condition is true, else if for alternative, else as fallback.\n\nExpected Output:\nGood evening.',
      syntax: ['if (condition) { ... } else if (condition) { ... } else { ... }']
    };
  }
  if (/switch/.test(t)) {
    return {
      title: 'C++ Switch',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  int day = 4;\n  switch (day) {\n    case 1: cout << "Monday"; break;\n    case 4: cout << "Thursday"; break;\n    default: cout << "Weekend"; break;\n  }\n  return 0;\n}',
      explanation: 'Use the switch statement to select one of many code blocks to be executed.\n\nExpected Output:\nThursday',
      syntax: ['switch(expression) { case x: ... break; default: ... break; }']
    };
  }
  if (/while/.test(t)) {
    return {
      title: 'C++ While Loop',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  int i = 0;\n  while (i < 5) {\n    cout << i << "\\n";\n    i++;\n  }\n  return 0;\n}',
      explanation: 'Loops can execute a block of code as long as a specified condition is reached.\n\nExpected Output:\n0\n1\n2\n3\n4',
      syntax: ['while (condition) { ... i++; }']
    };
  }
  if (/for loop|for/.test(t)) {
    return {
      title: 'C++ For Loop',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  for (int i = 0; i < 5; i++) {\n    cout << "Iteration: " << i << "\\n";\n  }\n  return 0;\n}',
      explanation: 'When you know exactly how many times you want to loop through a block of code, use the for loop.\n\nExpected Output:\nIteration: 0\nIteration: 1\nIteration: 2\nIteration: 3\nIteration: 4',
      syntax: ['for (statement 1; statement 2; statement 3) { ... }']
    };
  }
  if (/break|continue/.test(t)) {
    return {
      title: 'C++ Break and Continue',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  for (int i = 0; i < 10; i++) {\n    if (i == 4) continue; // Skip 4\n    if (i == 7) break;    // Stop at 7\n    cout << i << "\\n";\n  }\n  return 0;\n}',
      explanation: 'The break statement jumps out of a loop. The continue statement breaks one iteration and continues with next.\n\nExpected Output:\n0\n1\n2\n3\n5\n6',
      syntax: ['if (condition) break;', 'if (condition) continue;']
    };
  }
  if (/array/.test(t)) {
    return {
      title: 'C++ Arrays',
      language: 'cpp',
      code: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n  string cars[4] = {"Volvo", "BMW", "Ford", "Mazda"};\n  cars[0] = "Opel";\n  cout << "First car: " << cars[0] << "\\n";\n  cout << "Array size: " << sizeof(cars)/sizeof(string) << " elements\\n";\n  return 0;\n}',
      explanation: 'Arrays are used to store multiple values in a single variable, instead of declaring separate variables for each value.\n\nExpected Output:\nFirst car: Opel\nArray size: 4 elements',
      syntax: ['type arrayName[size] = {val1, val2};']
    };
  }
  if (/pass structure/.test(t)) {
    return {
      title: 'C++ Pass Structures to Functions',
      language: 'cpp',
      code: '#include <iostream>\n#include <string>\nusing namespace std;\n\nstruct Car {\n  string brand;\n  int year;\n};\n\nvoid printCar(const Car &c) {\n  cout << c.brand << " (" << c.year << ")\\n";\n}\n\nint main() {\n  Car myCar = {"Ford Mustang", 1969};\n  printCar(myCar);\n  return 0;\n}',
      explanation: 'You can pass structures as function arguments, typically by const reference to avoid unnecessary copying.\n\nExpected Output:\nFord Mustang (1969)',
      syntax: ['void print(const StructName &s);']
    };
  }
  if (/structure|struct/.test(t)) {
    return {
      title: 'C++ Structures (struct)',
      language: 'cpp',
      code: '#include <iostream>\n#include <string>\nusing namespace std;\n\nstruct Car {\n  string brand;\n  string model;\n  int year;\n};\n\nint main() {\n  Car myCar1 = {"BMW", "X5", 1999};\n  cout << myCar1.brand << " " << myCar1.model << " (" << myCar1.year << ")\\n";\n  return 0;\n}',
      explanation: 'Structures (also called structs) are a way to group several related variables into one place.\n\nExpected Output:\nBMW X5 (1999)',
      syntax: ['struct StructName { type member; };']
    };
  }
  if (/enum/.test(t)) {
    return {
      title: 'C++ Enums',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nenum Level {\n  LOW = 25,\n  MEDIUM = 50,\n  HIGH = 75\n};\n\nint main() {\n  Level myVar = MEDIUM;\n  cout << "Enum value: " << myVar << endl;\n  return 0;\n}',
      explanation: 'An enum is a special type that represents a group of constants (unchangeable values).\n\nExpected Output:\nEnum value: 50',
      syntax: ['enum Level { LOW, MEDIUM, HIGH };']
    };
  }
  if (/reference/.test(t)) {
    return {
      title: 'C++ References (&)',
      language: 'cpp',
      code: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n  string food = "Pizza";\n  string &meal = food; // Reference variable\n  meal = "Burger";\n  cout << "food: " << food << ", meal: " << meal << endl;\n  cout << "Memory address: " << &food << endl;\n  return 0;\n}',
      explanation: 'A reference variable is a "reference" to an existing variable, created with the & operator.\n\nExpected Output:\nfood: Burger, meal: Burger\nMemory address: 0x...',
      syntax: ['type &ref = originalVar;']
    };
  }
  if (/pointer/.test(t)) {
    return {
      title: 'C++ Pointers (*)',
      language: 'cpp',
      code: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n  string food = "Pizza";\n  string* ptr = &food; // Pointer stores memory address\n  cout << "Address: " << ptr << "\\n";\n  cout << "Dereference value: " << *ptr << "\\n";\n  return 0;\n}',
      explanation: 'A pointer is a variable that stores the memory address of another variable as its value. Dereference with *.\n\nExpected Output:\nAddress: 0x...\nDereference value: Pizza',
      syntax: ['type* ptr = &var;', '*ptr // Dereference']
    };
  }
  if (/memory management|new and delete/.test(t)) {
    return {
      title: 'C++ Dynamic Memory (new & delete)',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  int* ptr = new int(42); // Dynamically allocated integer\n  cout << "Dynamically allocated value: " << *ptr << endl;\n  delete ptr;\n  ptr = nullptr;\n  return 0;\n}',
      explanation: 'Dynamic memory is allocated on the heap using the new keyword and deallocated with delete.\n\nExpected Output:\nDynamically allocated value: 42',
      syntax: ['type* ptr = new type(val);', 'delete ptr;']
    };
  }
  if (/pass by reference/.test(t)) {
    return {
      title: 'C++ Pass by Reference',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nvoid swapNums(int &x, int &y) {\n  int z = x;\n  x = y;\n  y = z;\n}\n\nint main() {\n  int first = 10, second = 20;\n  swapNums(first, second);\n  cout << "first: " << first << ", second: " << second << endl;\n  return 0;\n}',
      explanation: 'When parameters are passed by reference (&), changes made inside the function affect the original variables.\n\nExpected Output:\nfirst: 20, second: 10',
      syntax: ['void swap(int &x, int &y) { ... }']
    };
  }
  if (/function overloading|overload/.test(t)) {
    return {
      title: 'C++ Function Overloading',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nint plusFunc(int x, int y) { return x + y; }\ndouble plusFunc(double x, double y) { return x + y; }\n\nint main() {\n  cout << "Int: " << plusFunc(8, 5) << "\\n";\n  cout << "Double: " << plusFunc(4.3, 6.26) << "\\n";\n  return 0;\n}',
      explanation: 'With function overloading, multiple functions can have the same name with different parameters.\n\nExpected Output:\nInt: 13\nDouble: 10.56',
      syntax: ['int func(int a);', 'double func(double a);']
    };
  }
  if (/recursion/.test(t)) {
    return {
      title: 'C++ Recursion',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nint sum(int k) {\n  if (k > 0) return k + sum(k - 1);\n  return 0;\n}\n\nint main() {\n  int result = sum(10);\n  cout << "Sum from 1 to 10: " << result << endl;\n  return 0;\n}',
      explanation: 'Recursion is the technique of making a function call itself, with a base case to prevent infinite loops.\n\nExpected Output:\nSum from 1 to 10: 55',
      syntax: ['int sum(int k) { if (k > 0) return k + sum(k - 1); return 0; }']
    };
  }
  if (/lambda/.test(t)) {
    return {
      title: 'C++ Lambda Expressions',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  auto add = [](int a, int b) -> int {\n    return a + b;\n  };\n  cout << "Lambda sum: " << add(5, 7) << endl;\n  return 0;\n}',
      explanation: 'A lambda expression is an anonymous function that can capture variables from its enclosing scope.\n\nExpected Output:\nLambda sum: 12',
      syntax: ['auto lambda = [](params) -> returnType { ... };']
    };
  }
  if (/default parameter/.test(t)) {
    return {
      title: 'C++ Default Parameters',
      language: 'cpp',
      code: '#include <iostream>\n#include <string>\nusing namespace std;\n\nvoid myFunction(string country = "Norway") {\n  cout << country << "\\n";\n}\n\nint main() {\n  myFunction("Sweden");\n  myFunction("India");\n  myFunction();\n  return 0;\n}',
      explanation: 'You can use a default parameter value by using the equals sign (=) in the function declaration.\n\nExpected Output:\nSweden\nIndia\nNorway',
      syntax: ['void func(type param = defaultValue);']
    };
  }
  if (/multiple parameter/.test(t)) {
    return {
      title: 'C++ Multiple Parameters',
      language: 'cpp',
      code: '#include <iostream>\n#include <string>\nusing namespace std;\n\nvoid printInfo(string fname, int age) {\n  cout << fname << " Refsnes is " << age << " years old.\\n";\n}\n\nint main() {\n  printInfo("Liam", 3);\n  printInfo("Jenny", 14);\n  return 0;\n}',
      explanation: 'Inside the function, you can add as many parameters as you want, separated by commas.\n\nExpected Output:\nLiam Refsnes is 3 years old.\nJenny Refsnes is 14 years old.',
      syntax: ['void func(type1 param1, type2 param2);']
    };
  }
  if (/return value/.test(t)) {
    return {
      title: 'C++ Function Return Values',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nint add(int x, int y) {\n  return x + y;\n}\n\nint main() {\n  int z = add(5, 3);\n  cout << "Returned result: " << z << endl;\n  return 0;\n}',
      explanation: 'The void keyword indicates that the function should not return a value. To return a value, specify a data type.\n\nExpected Output:\nReturned result: 8',
      syntax: ['int add(int x, int y) { return x + y; }']
    };
  }
  if (/function parameter|parameter/.test(t)) {
    return {
      title: 'C++ Function Parameters',
      language: 'cpp',
      code: '#include <iostream>\n#include <string>\nusing namespace std;\n\nvoid printName(string fname) {\n  cout << fname << " Refsnes\\n";\n}\n\nint main() {\n  printName("Liam");\n  printName("Jenny");\n  return 0;\n}',
      explanation: 'Information can be passed to functions as a parameter. Parameters act as variables inside the function.\n\nExpected Output:\nLiam Refsnes\nJenny Refsnes',
      syntax: ['void func(type paramName);']
    };
  }
  if (/friend function|friend/.test(t)) {
    return {
      title: 'C++ Friend Functions',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nclass Box {\n  private:\n    int width = 25;\n    friend void printWidth(Box b);\n};\n\nvoid printWidth(Box b) {\n  cout << "Box width from friend function: " << b.width << endl;\n}\n\nint main() {\n  Box box;\n  printWidth(box);\n  return 0;\n}',
      explanation: 'A friend function of a class is defined outside that class scope but has the right to access private members of the class.\n\nExpected Output:\nBox width from friend function: 25',
      syntax: ['friend returnType functionName(ClassName obj);']
    };
  }
  if (/virtual function|virtual/.test(t)) {
    return {
      title: 'C++ Virtual Functions & Polymorphism',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nclass Animal {\n  public:\n    virtual void animalSound() {\n      cout << "The animal makes a sound\\n";\n    }\n};\n\nclass Pig : public Animal {\n  public:\n    void animalSound() override {\n      cout << "The pig says: wee wee\\n";\n    }\n};\n\nint main() {\n  Animal* myAnimal = new Pig();\n  myAnimal->animalSound();\n  delete myAnimal;\n  return 0;\n}',
      explanation: 'A virtual function is a member function in the base class that you expect to redefine in derived classes, resolved via dynamic dispatch.\n\nExpected Output:\nThe pig says: wee wee',
      syntax: ['virtual void functionName();', 'void functionName() override;']
    };
  }
  if (/function/.test(t)) {
    return {
      title: 'C++ Functions',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nvoid myFunction() {\n  cout << "I just got executed!\\n";\n}\n\nint main() {\n  myFunction();\n  myFunction();\n  return 0;\n}',
      explanation: 'A function is a block of code which only runs when it is called. void means the function has no return value.\n\nExpected Output:\nI just got executed!\nI just got executed!',
      syntax: ['void myFunction() { ... }', 'myFunction();']
    };
  }
  if (/constructor/.test(t)) {
    return {
      title: 'C++ Constructors',
      language: 'cpp',
      code: '#include <iostream>\n#include <string>\nusing namespace std;\n\nclass Car {\n  public:\n    string brand;\n    string model;\n    int year;\n    Car(string x, string y, int z) {\n      brand = x; model = y; year = z;\n    }\n};\n\nint main() {\n  Car carObj1("BMW", "X5", 1999);\n  cout << carObj1.brand << " " << carObj1.model << " " << carObj1.year << endl;\n  return 0;\n}',
      explanation: 'A constructor in C++ is a special method that is automatically called when an object of a class is created.\n\nExpected Output:\nBMW X5 1999',
      syntax: ['class ClassName { public: ClassName(params) { ... } };']
    };
  }
  if (/access specifier|encapsulation/.test(t)) {
    return {
      title: 'C++ Encapsulation & Access Specifiers',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nclass Employee {\n  private:\n    int salary;\n  public:\n    void setSalary(int s) { salary = s; }\n    int getSalary() { return salary; }\n};\n\nint main() {\n  Employee myObj;\n  myObj.setSalary(50000);\n  cout << "Employee salary: " << myObj.getSalary() << endl;\n  return 0;\n}',
      explanation: 'Encapsulation ensures "sensitive" data is hidden from users using private variables and public get/set methods.\n\nExpected Output:\nEmployee salary: 50000',
      syntax: ['private: int sensitiveData;', 'public: void set(int x); int get();']
    };
  }
  if (/friend/.test(t)) {
    return {
      title: 'C++ Friend Functions',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nclass Box {\n  private:\n    int width = 10;\n  public:\n    friend void printWidth(Box b);\n};\n\nvoid printWidth(Box b) {\n  cout << "Width of box: " << b.width << endl;\n}\n\nint main() {\n  Box box;\n  printWidth(box);\n  return 0;\n}',
      explanation: 'A friend function of a class is defined outside that class scope but has the right to access all private members.\n\nExpected Output:\nWidth of box: 10',
      syntax: ['friend returnType functionName(ClassName obj);']
    };
  }
  if (/multilevel|multiple inheritance|inheritance/.test(t)) {
    return {
      title: 'C++ Inheritance',
      language: 'cpp',
      code: '#include <iostream>\n#include <string>\nusing namespace std;\n\nclass Vehicle {\n  public:\n    string brand = "Ford";\n    void honk() { cout << "Tuut, tuut!\\n"; }\n};\n\nclass Car: public Vehicle {\n  public:\n    string model = "Mustang";\n};\n\nint main() {\n  Car myCar;\n  myCar.honk();\n  cout << myCar.brand + " " + myCar.model << endl;\n  return 0;\n}',
      explanation: 'In C++, it is possible to inherit attributes and methods from one class to another (: public BaseClass).\n\nExpected Output:\nTuut, tuut!\nFord Mustang',
      syntax: ['class SubClass : public SuperClass { ... };']
    };
  }
  if (/polymorphism|virtual/.test(t)) {
    return {
      title: 'C++ Polymorphism & Virtual Functions',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nclass Animal {\n  public:\n    virtual void animalSound() { cout << "Animal sound\\n"; }\n};\nclass Pig : public Animal {\n  public:\n    void animalSound() override { cout << "The pig says: wee wee\\n"; }\n};\n\nint main() {\n  Animal* myAnimal = new Pig();\n  myAnimal->animalSound();\n  delete myAnimal;\n  return 0;\n}',
      explanation: 'Virtual functions ensure the correct function is called for an object, regardless of the type of pointer used.\n\nExpected Output:\nThe pig says: wee wee',
      syntax: ['virtual void sound();', 'void sound() override;']
    };
  }
  if (/template/.test(t)) {
    return {
      title: 'C++ Templates',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\ntemplate <typename T>\nT myMax(T x, T y) {\n  return (x > y) ? x : y;\n}\n\nint main() {\n  cout << "Max int: " << myMax<int>(3, 7) << "\\n";\n  cout << "Max double: " << myMax<double>(3.0, 7.5) << "\\n";\n  cout << "Max char: " << myMax<char>(\'g\', \'e\') << "\\n";\n  return 0;\n}',
      explanation: 'Templates allow writing generic code that works with any data type without re-writing for each type.\n\nExpected Output:\nMax int: 7\nMax double: 7.5\nMax char: g',
      syntax: ['template <typename T> T func(T x, T y) { ... }']
    };
  }
  if (/file|fstream/.test(t)) {
    return {
      title: 'C++ File Handling (<fstream>)',
      language: 'cpp',
      code: '#include <iostream>\n#include <fstream>\n#include <string>\nusing namespace std;\n\nint main() {\n  ofstream MyWriteFile("filename.txt");\n  MyWriteFile << "Files in C++ are easy to use!";\n  MyWriteFile.close();\n\n  string myText;\n  ifstream MyReadFile("filename.txt");\n  getline(MyReadFile, myText);\n  cout << "Read from file: " << myText << endl;\n  MyReadFile.close();\n  return 0;\n}',
      explanation: 'The fstream library provides ofstream to create/write files and ifstream to read files.\n\nExpected Output:\nRead from file: Files in C++ are easy to use!',
      syntax: ['#include <fstream>', 'ofstream MyFile(path);', 'ifstream MyReadFile(path);']
    };
  }
  if (/date|ctime/.test(t)) {
    return {
      title: 'C++ Date and Time (<ctime>)',
      language: 'cpp',
      code: '#include <iostream>\n#include <ctime>\nusing namespace std;\n\nint main() {\n  time_t now = time(0);\n  char* dt = ctime(&now);\n  cout << "Current local date and time: " << dt;\n  return 0;\n}',
      explanation: 'The <ctime> header file contains functions and types to handle date and time in C++.\n\nExpected Output:\nCurrent local date and time: (active timestamp string)',
      syntax: ['#include <ctime>', 'time_t now = time(0);', 'ctime(&now)']
    };
  }
  if (/exception|error/.test(t)) {
    return {
      title: 'C++ Exceptions (try...catch...throw)',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  try {\n    int age = 15;\n    if (age >= 18) {\n      cout << "Access granted - you are old enough.\\n";\n    } else {\n      throw (age);\n    }\n  } catch (int myNum) {\n    cout << "Access denied - You must be at least 18 years old.\\n";\n    cout << "Age is: " << myNum << endl;\n  }\n  return 0;\n}',
      explanation: 'Exception handling in C++ consists of three keywords: try, throw, and catch.\n\nExpected Output:\nAccess denied - You must be at least 18 years old.\nAge is: 15',
      syntax: ['try { if (err) throw val; } catch (type var) { ... }']
    };
  }
  if (/vector/.test(t)) {
    return {
      title: 'C++ Vectors (STL)',
      language: 'cpp',
      code: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n  vector<string> cars = {"Volvo", "BMW", "Ford"};\n  cars.push_back("Tesla");\n  cout << "Vector size: " << cars.size() << "\\n";\n  for (string car : cars) {\n    cout << car << "\\n";\n  }\n  return 0;\n}',
      explanation: 'A vector in C++ is a dynamic array from the Standard Template Library (STL) that resizes automatically.\n\nExpected Output:\nVector size: 4\nVolvo\nBMW\nFord\nTesla',
      syntax: ['#include <vector>', 'vector<type> vec;', 'vec.push_back(val);']
    };
  }
  if (/list/.test(t)) {
    return {
      title: 'C++ Lists (STL Doubly-Linked List)',
      language: 'cpp',
      code: '#include <iostream>\n#include <list>\nusing namespace std;\n\nint main() {\n  list<int> numbers = {1, 2, 3};\n  numbers.push_front(0);\n  numbers.push_back(4);\n  for (int n : numbers) cout << n << " ";\n  cout << endl;\n  return 0;\n}',
      explanation: 'A list in C++ STL is a doubly-linked list that allows efficient insertion and deletion anywhere.\n\nExpected Output:\n0 1 2 3 4',
      syntax: ['#include <list>', 'list<type> l;', 'l.push_front(x);', 'l.push_back(y);']
    };
  }
  if (/stack/.test(t)) {
    return {
      title: 'C++ Stacks (STL LIFO)',
      language: 'cpp',
      code: '#include <iostream>\n#include <stack>\nusing namespace std;\n\nint main() {\n  stack<string> cars;\n  cars.push("Volvo");\n  cars.push("BMW");\n  cars.push("Ford");\n  cout << "Top element: " << cars.top() << endl;\n  cars.pop();\n  cout << "New top element: " << cars.top() << endl;\n  return 0;\n}',
      explanation: 'A stack stores multiple elements in a specific order, called LIFO (Last In, First Out).\n\nExpected Output:\nTop element: Ford\nNew top element: BMW',
      syntax: ['#include <stack>', 'stack<type> s;', 's.push(x);', 's.pop();']
    };
  }
  if (/queue|deque/.test(t)) {
    return {
      title: 'C++ Queues (STL FIFO)',
      language: 'cpp',
      code: '#include <iostream>\n#include <queue>\nusing namespace std;\n\nint main() {\n  queue<string> cars;\n  cars.push("Volvo");\n  cars.push("BMW");\n  cout << "Front element: " << cars.front() << endl;\n  cars.pop();\n  cout << "New front element: " << cars.front() << endl;\n  return 0;\n}',
      explanation: 'A queue stores multiple elements in FIFO (First In, First Out) order.\n\nExpected Output:\nFront element: Volvo\nNew front element: BMW',
      syntax: ['#include <queue>', 'queue<type> q;', 'q.push(x);', 'q.pop();']
    };
  }
  if (/set/.test(t)) {
    return {
      title: 'C++ Sets (STL Unique Sorted)',
      language: 'cpp',
      code: '#include <iostream>\n#include <set>\nusing namespace std;\n\nint main() {\n  set<int> numbers = {1, 7, 3, 2, 5, 9, 2}; // duplicate 2 ignored\n  for (int num : numbers) {\n    cout << num << " ";\n  }\n  cout << "\\nSize: " << numbers.size() << endl;\n  return 0;\n}',
      explanation: 'A set stores unique elements, and they are automatically sorted in ascending order.\n\nExpected Output:\n1 2 3 5 7 9 \nSize: 6',
      syntax: ['#include <set>', 'set<type> s = { ... };']
    };
  }
  if (/map/.test(t)) {
    return {
      title: 'C++ Maps (STL Key-Value Pairs)',
      language: 'cpp',
      code: '#include <iostream>\n#include <map>\nusing namespace std;\n\nint main() {\n  map<string, int> people = { {"John", 32}, {"Adele", 45}, {"Bo", 29} };\n  people["Jenny"] = 50;\n  for (auto pair : people) {\n    cout << pair.first << " is: " << pair.second << "\\n";\n  }\n  return 0;\n}',
      explanation: 'A map stores elements in key/value pairs, where keys are unique and automatically sorted.\n\nExpected Output:\nAdele is: 45\nBo is: 29\nJenny is: 50\nJohn is: 32',
      syntax: ['#include <map>', 'map<K, V> m;', 'm[key] = value;']
    };
  }
  if (/iterator/.test(t)) {
    return {
      title: 'C++ Iterators',
      language: 'cpp',
      code: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n  vector<string> cars = {"Volvo", "BMW", "Ford"};\n  vector<string>::iterator it;\n  for (it = cars.begin(); it != cars.end(); ++it) {\n    cout << *it << "\\n";\n  }\n  return 0;\n}',
      explanation: 'Iterators are used to point to the memory addresses of STL containers, acting like pointers.\n\nExpected Output:\nVolvo\nBMW\nFord',
      syntax: ['container::iterator it = c.begin();']
    };
  }
  if (/algorithm/.test(t)) {
    return {
      title: 'C++ STL Algorithms (<algorithm>)',
      language: 'cpp',
      code: '#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n  vector<int> numbers = {5, 2, 8, 1, 9};\n  sort(numbers.begin(), numbers.end());\n  cout << "Sorted: ";\n  for (int n : numbers) cout << n << " ";\n  cout << "\\nFound 8? " << binary_search(numbers.begin(), numbers.end(), 8) << endl;\n  return 0;\n}',
      explanation: 'The <algorithm> library provides searching, sorting, counting, and manipulating functions for STL collections.\n\nExpected Output:\nSorted: 1 2 5 8 9 \nFound 8? 1',
      syntax: ['#include <algorithm>', 'sort(vec.begin(), vec.end());']
    };
  }
  if (/namespace/.test(t)) {
    return {
      title: 'C++ Namespaces',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nnamespace First {\n  int val = 500;\n}\nnamespace Second {\n  double val = 3.1416;\n}\n\nint main() {\n  cout << "First namespace: " << First::val << endl;\n  cout << "Second namespace: " << Second::val << endl;\n  return 0;\n}',
      explanation: 'Namespaces allow us to group named entities like classes, objects and functions under a name to prevent collisions.\n\nExpected Output:\nFirst namespace: 500\nSecond namespace: 3.1416',
      syntax: ['namespace Name { ... }', 'Name::entity']
    };
  }
  if (/class|object|oop/.test(t)) {
    return {
      title: 'C++ Classes and Objects',
      language: 'cpp',
      code: '#include <iostream>\n#include <string>\nusing namespace std;\n\nclass MyClass {\n  public:\n    int myNum;\n    string myString;\n};\n\nint main() {\n  MyClass myObj;\n  myObj.myNum = 15;\n  myObj.myString = "Some text";\n  cout << myObj.myNum << "\\n";\n  cout << myObj.myString << "\\n";\n  return 0;\n}',
      explanation: 'C++ is an object-oriented programming language. Everything in C++ is associated with classes and objects.\n\nExpected Output:\n15\nSome text',
      syntax: ['class ClassName { public: int prop; };', 'ClassName obj;']
    };
  }

  if (/debugging/.test(t)) {
    return {
      title: 'C++ Debugging (std::cerr & assertions)',
      language: 'cpp',
      code: '#include <iostream>\n#include <cassert>\nusing namespace std;\n\nint main() {\n  int score = 85;\n  assert(score >= 0 && "Score must be non-negative");\n  cerr << "[DEBUG] Score checkpoint validated: " << score << endl;\n  return 0;\n}',
      explanation: 'C++ uses std::cerr for unbuffered error/debug output and assert() from <cassert> to verify conditions.\n\nExpected Output:\n[DEBUG] Score checkpoint validated: 85',
      syntax: ['#include <cassert>', 'assert(condition);', 'cerr << "Debug info";']
    };
  }
  if (/input validation/.test(t)) {
    return {
      title: 'C++ Input Validation',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  int age = 21;\n  if (age < 0 || age > 120) {\n    cout << "Invalid age detected\\n";\n  } else {\n    cout << "Valid age entered: " << age << endl;\n  }\n  return 0;\n}',
      explanation: 'Input validation checks incoming user data to prevent buffer overflows, type mismatches, and logical errors.\n\nExpected Output:\nValid age entered: 21',
      syntax: ['if (cin.fail()) { cin.clear(); cin.ignore(); }']
    };
  }
  if (/keywords/.test(t)) {
    return {
      title: 'C++ Keywords (const, constexpr, auto)',
      language: 'cpp',
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  const int maxUsers = 100;\n  constexpr double PI = 3.14159265;\n  auto message = "C++ Keywords demonstration";\n  cout << message << "\\nMax: " << maxUsers << ", PI: " << PI << endl;\n  return 0;\n}',
      explanation: 'C++ keywords are reserved words that have a special meaning in the language, such as const, constexpr, and auto.\n\nExpected Output:\nC++ Keywords demonstration\nMax: 100, PI: 3.14159',
      syntax: ['const type var = val;', 'constexpr type var = compileTimeVal;', 'auto var = val;']
    };
  }
  if (/iostream/.test(t)) {
    return {
      title: 'C++ <iostream> Standard Streams',
      language: 'cpp',
      code: '#include <iostream>\n\nint main() {\n  std::cout << "Standard output stream\\n";\n  std::cerr << "Standard error stream\\n";\n  std::clog << "Standard log stream\\n";\n  return 0;\n}',
      explanation: 'The <iostream> header defines the standard input/output stream objects: std::cin, std::cout, std::cerr, and std::clog.\n\nExpected Output:\nStandard output stream\nStandard error stream\nStandard log stream',
      syntax: ['#include <iostream>', 'std::cout << "text";']
    };
  }

  return {
    title: 'C++ Program Execution',
    language: 'cpp',
    code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  int x = 10, y = 20;\n  cout << "Sum: " << (x + y) << endl;\n  return 0;\n}',
    explanation: 'Basic C++ console execution demonstrating variables, arithmetic, and standard stream output.\n\nExpected Output:\nSum: 30',
    syntax: ['cout << value << endl;']
  };
}
