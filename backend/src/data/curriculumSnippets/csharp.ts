import type { ExampleSnippet } from './types.js';

export function getCSharpExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  if (/home|intro|get started/.test(t)) {
    return {
      title: 'C# Get Started - Hello World',
      language: 'csharp',
      code: 'using System;\n\nnamespace HelloWorld\n{\n  class Program\n  {\n    static void Main(string[] args)\n    {\n      Console.WriteLine("Hello World!");\n    }\n  }\n}',
      explanation: 'Every C# program has a Main method inside a class. Console is a class in the System namespace.\n\nExpected Output:\nHello World!',
      syntax: ['Console.WriteLine("text");']
    };
  }
  if (/syntax/.test(t)) {
    return {
      title: 'C# Program Syntax',
      language: 'csharp',
      code: 'using System;\n\nnamespace MyFirstApp\n{\n  class Program\n  {\n    static void Main(string[] args)\n    {\n      Console.WriteLine("C# syntax executes sequentially.");\n    }\n  }\n}',
      explanation: 'Line 1: using System means using classes from the System namespace. Statements end with a semicolon.\n\nExpected Output:\nC# syntax executes sequentially.',
      syntax: ['namespace Name { class ClassName { static void Main(string[] args) { ... } } }']
    };
  }
  if (/output|writeline|write/.test(t)) {
    return {
      title: 'C# Output (WriteLine vs Write)',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    Console.WriteLine("Prints on a new line");\n    Console.Write("Prints on ");\n    Console.Write("the same line.");\n  }\n}',
      explanation: 'WriteLine() outputs text on a new line each time, while Write() prints on the same line.\n\nExpected Output:\nPrints on a new line\nPrints on the same line.',
      syntax: ['Console.WriteLine(value);', 'Console.Write(value);']
    };
  }
  if (/comment/.test(t)) {
    return {
      title: 'C# Comments',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    // This is a single-line comment\n    Console.WriteLine("Comments are ignored by the C# compiler");\n    /* This is a multiline\n       comment in C# */\n  }\n}',
      explanation: 'Single-line comments start with two forward slashes (//). Multi-line comments start with /* and end with */.\n\nExpected Output:\nComments are ignored by the C# compiler',
      syntax: ['// Single-line comment', '/* Multi-line comment */']
    };
  }
  if (/constant/.test(t)) {
    return {
      title: 'C# Constants (const keyword)',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    const double PI = 3.14159;\n    const int BIRTH_YEAR = 1998;\n    // PI = 3.14; // Compiler error: constants cannot be changed\n    Console.WriteLine("PI: " + PI + ", Year: " + BIRTH_YEAR);\n  }\n}',
      explanation: 'The const keyword declares an unchangeable, read-only constant.\n\nExpected Output:\nPI: 3.14159, Year: 1998',
      syntax: ['const type CONSTANT_NAME = value;']
    };
  }
  if (/multiple variable/.test(t)) {
    return {
      title: 'C# Multiple Variables Declaration',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    int x = 5, y = 6, z = 50;\n    Console.WriteLine(x + y + z);\n  }\n}',
      explanation: 'To declare more than one variable of the same type, use a comma-separated list.\n\nExpected Output:\n61',
      syntax: ['type var1 = val1, var2 = val2, var3 = val3;']
    };
  }
  if (/display variable/.test(t)) {
    return {
      title: 'C# Display Variables',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    string name = "John";\n    int age = 25;\n    Console.WriteLine("Name: " + name + ", Age: " + age);\n  }\n}',
      explanation: 'The WriteLine() method is often used to display variables using the + operator to combine text and variables.\n\nExpected Output:\nName: John, Age: 25',
      syntax: ['Console.WriteLine("text" + variable);']
    };
  }
  if (/identifier/.test(t)) {
    return {
      title: 'C# Identifiers & Naming',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    // Good identifiers: descriptive and readable\n    int minutesPerHour = 60;\n    int m = 60; // OK, but not easy to understand what m is\n    Console.WriteLine("Minutes per hour: " + minutesPerHour);\n  }\n}',
      explanation: 'All C# variables must be identified with unique names. Identifiers can contain letters, digits, and underscores.\n\nExpected Output:\nMinutes per hour: 60',
      syntax: ['type descriptiveVariableName = value;']
    };
  }
  if (/type casting|cast/.test(t)) {
    return {
      title: 'C# Type Casting (Implicit and Explicit)',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    // Implicit casting (char -> int -> long -> float -> double)\n    int myInt = 9;\n    double myDouble = myInt;\n    Console.WriteLine("Implicit: " + myDouble);\n\n    // Explicit casting (double -> int)\n    double pi = 9.78;\n    int intPi = (int) pi;\n    Console.WriteLine("Explicit: " + intPi);\n\n    // Type conversion methods\n    Console.WriteLine("Convert: " + Convert.ToString(myInt));\n  }\n}',
      explanation: 'Implicit casting happens automatically when passing a smaller size type to a larger size type. Explicit casting requires parentheses.\n\nExpected Output:\nImplicit: 9\nExplicit: 9\nConvert: 9',
      syntax: ['double d = myInt; // Implicit', 'int i = (int) myDouble; // Explicit']
    };
  }
  if (/user input/.test(t)) {
    return {
      title: 'C# User Input (Console.ReadLine)',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    Console.WriteLine("Enter username:");\n    string userName = Console.ReadLine();\n    Console.WriteLine("Username is: " + userName);\n  }\n}',
      explanation: 'Console.ReadLine() gets user input from the console. It returns a string.\n\nExpected Output:\nEnter username:\nUsername is: (entered text)',
      syntax: ['string input = Console.ReadLine();']
    };
  }
  if (/data type/.test(t)) {
    return {
      title: 'C# Data Types',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    int myNum = 5;               // Integer\n    double myDoubleNum = 5.99D;  // Floating point number\n    char myLetter = \'D\';         // Character\n    bool myBool = true;          // Boolean\n    string myText = "Hello";     // String\n    Console.WriteLine($"{myNum}, {myDoubleNum}, {myLetter}, {myBool}, {myText}");\n  }\n}',
      explanation: 'C# is a strongly-typed language. Every variable must have a declared data type.\n\nExpected Output:\n5, 5.99, D, True, Hello',
      syntax: ['int num = 5;', 'double d = 5.99;', 'char c = \'A\';', 'bool b = true;']
    };
  }
  if (/variable/.test(t)) {
    return {
      title: 'C# Variables and Assignment',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    string name = "John";\n    int myNum = 15;\n    myNum = 20; // myNum is now 20\n    Console.WriteLine(name + " has " + myNum + " points.");\n  }\n}',
      explanation: 'Variables are containers for storing data values. In C#, there are different types of variables.\n\nExpected Output:\nJohn has 20 points.',
      syntax: ['type variableName = value;']
    };
  }
  if (/operator/.test(t)) {
    return {
      title: 'C# Arithmetic and Comparison Operators',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    int sum1 = 100 + 50;\n    int sum2 = sum1 + 250;\n    int product = sum1 * 2;\n    bool isGreater = sum2 > product;\n    Console.WriteLine("sum1: " + sum1 + ", sum2: " + sum2 + ", isGreater: " + isGreater);\n  }\n}',
      explanation: 'Operators are used to perform operations on variables and values (+, -, *, /, %, ++, --).\n\nExpected Output:\nsum1: 150, sum2: 400, isGreater: True',
      syntax: ['int z = x + y;', 'bool b = x > y;']
    };
  }
  if (/math/.test(t)) {
    return {
      title: 'C# Math Class',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    Console.WriteLine("Max: " + Math.Max(5, 10));\n    Console.WriteLine("Min: " + Math.Min(5, 10));\n    Console.WriteLine("Sqrt: " + Math.Sqrt(64));\n    Console.WriteLine("Abs: " + Math.Abs(-4.7));\n    Console.WriteLine("Round: " + Math.Round(9.99));\n  }\n}',
      explanation: 'The C# Math class has many methods that allow you to perform mathematical operations on numbers.\n\nExpected Output:\nMax: 10\nMin: 5\nSqrt: 8\nAbs: 4.7\nRound: 10',
      syntax: ['Math.Max(x, y)', 'Math.Sqrt(x)', 'Math.Round(x)']
    };
  }
  if (/string/.test(t)) {
    return {
      title: 'C# Strings and Interpolation',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    string txt = "Hello World";\n    Console.WriteLine("Length: " + txt.Length);\n    Console.WriteLine("Upper: " + txt.ToUpper());\n    Console.WriteLine("First char: " + txt[0]);\n    string firstName = "John", lastName = "Doe";\n    Console.WriteLine($"Full name: {firstName} {lastName}");\n  }\n}',
      explanation: 'A string in C# is an object that contains a collection of characters. String interpolation uses $\"...{var}...\".\n\nExpected Output:\nLength: 11\nUpper: HELLO WORLD\nFirst char: H\nFull name: John Doe',
      syntax: ['str.Length', 'str.ToUpper()', '$\"{var1} {var2}\"']
    };
  }
  if (/boolean/.test(t)) {
    return {
      title: 'C# Booleans and Expressions',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    bool isCSharpFun = true;\n    bool isFishTasty = false;\n    Console.WriteLine(isCSharpFun);\n    Console.WriteLine(isFishTasty);\n    int x = 10, y = 9;\n    Console.WriteLine(x > y); // Returns True\n  }\n}',
      explanation: 'A boolean type is declared with the bool keyword and can only take the values true or false.\n\nExpected Output:\nTrue\nFalse\nTrue',
      syntax: ['bool myBool = true;', 'bool result = x > y;']
    };
  }
  if (/if\.\.\.else|if/.test(t)) {
    return {
      title: 'C# If...Else Conditional Branches',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    int time = 22;\n    if (time < 10) {\n      Console.WriteLine("Good morning.");\n    } else if (time < 20) {\n      Console.WriteLine("Good day.");\n    } else {\n      Console.WriteLine("Good evening.");\n    }\n  }\n}',
      explanation: 'Use if to specify a block of code to be executed if a specified condition is true, else if for a new condition, and else as fallback.\n\nExpected Output:\nGood evening.',
      syntax: ['if (condition) { ... } else if (condition) { ... } else { ... }']
    };
  }
  if (/switch/.test(t)) {
    return {
      title: 'C# Switch Statement',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    int day = 4;\n    switch (day) {\n      case 1:\n        Console.WriteLine("Monday");\n        break;\n      case 4:\n        Console.WriteLine("Thursday");\n        break;\n      default:\n        Console.WriteLine("Looking forward to the Weekend.");\n        break;\n    }\n  }\n}',
      explanation: 'Use the switch statement to select one of many code blocks to be executed.\n\nExpected Output:\nThursday',
      syntax: ['switch(expression) { case x: ... break; default: ... break; }']
    };
  }
  if (/while/.test(t)) {
    return {
      title: 'C# While and Do/While Loops',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    int i = 0;\n    while (i < 5) {\n      Console.WriteLine("While: " + i);\n      i++;\n    }\n  }\n}',
      explanation: 'The while loop loops through a block of code as long as a specified condition is True.\n\nExpected Output:\nWhile: 0\nWhile: 1\nWhile: 2\nWhile: 3\nWhile: 4',
      syntax: ['while (condition) { ... i++; }']
    };
  }
  if (/for loop|for/.test(t)) {
    return {
      title: 'C# For Loop',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    for (int i = 0; i < 5; i++) {\n      Console.WriteLine("Iteration " + i);\n    }\n  }\n}',
      explanation: 'When you know exactly how many times you want to loop through a block of code, use the for loop.\n\nExpected Output:\nIteration 0\nIteration 1\nIteration 2\nIteration 3\nIteration 4',
      syntax: ['for (statement 1; statement 2; statement 3) { ... }']
    };
  }
  if (/break|continue/.test(t)) {
    return {
      title: 'C# Break and Continue',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    for (int i = 0; i < 10; i++) {\n      if (i == 4) continue; // Skip 4\n      if (i == 7) break;    // Stop loop at 7\n      Console.WriteLine("i = " + i);\n    }\n  }\n}',
      explanation: 'The break statement jumps out of a loop. The continue statement breaks one iteration and continues with the next.\n\nExpected Output:\ni = 0\ni = 1\ni = 2\ni = 3\ni = 5\ni = 6',
      syntax: ['if (cond) break;', 'if (cond) continue;']
    };
  }
  if (/sort array/.test(t)) {
    return {
      title: 'C# Sort Arrays',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    string[] cars = {"Volvo", "BMW", "Ford", "Mazda"};\n    Array.Sort(cars);\n    foreach (string car in cars) {\n      Console.WriteLine(car);\n    }\n  }\n}',
      explanation: 'Array.Sort() sorts an array alphabetically or in an ascending order.\n\nExpected Output:\nBMW\nFord\nMazda\nVolvo',
      syntax: ['Array.Sort(arrayName);']
    };
  }
  if (/multidimensional/.test(t)) {
    return {
      title: 'C# Multidimensional 2D Arrays',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    int[,] numbers = { {1, 4, 2}, {3, 6, 8} };\n    Console.WriteLine("Element [0, 2]: " + numbers[0, 2]);\n    Console.WriteLine("Element [1, 1]: " + numbers[1, 1]);\n  }\n}',
      explanation: 'A multidimensional array is declared by adding commas inside the square brackets: int[,] array = ...;\n\nExpected Output:\nElement [0, 2]: 2\nElement [1, 1]: 6',
      syntax: ['int[,] numbers = { {1, 2}, {3, 4} };', 'numbers[row, col]']
    };
  }
  if (/loop through an array|foreach/.test(t)) {
    return {
      title: 'C# Foreach Loop on Arrays',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    string[] cars = {"Volvo", "BMW", "Ford", "Mazda"};\n    foreach (string car in cars) {\n      Console.WriteLine(car);\n    }\n  }\n}',
      explanation: 'The foreach loop is used exclusively to loop through elements in an array or collection.\n\nExpected Output:\nVolvo\nBMW\nFord\nMazda',
      syntax: ['foreach (type variableName in arrayName) { ... }']
    };
  }
  if (/array/.test(t)) {
    return {
      title: 'C# Arrays',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    string[] cars = {"Volvo", "BMW", "Ford", "Mazda"};\n    Console.WriteLine("First car: " + cars[0]);\n    cars[0] = "Opel";\n    Console.WriteLine("Updated first car: " + cars[0]);\n    Console.WriteLine("Total cars: " + cars.Length);\n  }\n}',
      explanation: 'Arrays are used to store multiple values in a single variable, instead of declaring separate variables for each value.\n\nExpected Output:\nFirst car: Volvo\nUpdated first car: Opel\nTotal cars: 4',
      syntax: ['type[] arrayName = {"val1", "val2"};', 'arrayName[index]']
    };
  }
  if (/default parameter/.test(t)) {
    return {
      title: 'C# Default Parameter Value',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void MyMethod(string country = "Norway") {\n    Console.WriteLine(country);\n  }\n  static void Main() {\n    MyMethod("Sweden");\n    MyMethod("India");\n    MyMethod();\n  }\n}',
      explanation: 'You can also use a default parameter value by using the equals sign (=). If called without an argument, it uses the default.\n\nExpected Output:\nSweden\nIndia\nNorway',
      syntax: ['static void MethodName(type param = defaultValue) { ... }']
    };
  }
  if (/named argument/.test(t)) {
    return {
      title: 'C# Named Arguments',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void MyMethod(string child1, string child2, string child3) {\n    Console.WriteLine("The youngest child is: " + child3);\n  }\n  static void Main() {\n    MyMethod(child3: "John", child1: "Liam", child2: "Liam");\n  }\n}',
      explanation: 'You can send arguments with the key: value syntax. That way, the order of the arguments does not matter.\n\nExpected Output:\nThe youngest child is: John',
      syntax: ['MyMethod(argName: value);']
    };
  }
  if (/method overloading|overload/.test(t)) {
    return {
      title: 'C# Method Overloading',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static int PlusMethod(int x, int y) {\n    return x + y;\n  }\n  static double PlusMethod(double x, double y) {\n    return x + y;\n  }\n  static void Main() {\n    int myNum1 = PlusMethod(8, 5);\n    double myNum2 = PlusMethod(4.3, 6.26);\n    Console.WriteLine("Int: " + myNum1);\n    Console.WriteLine("Double: " + myNum2);\n  }\n}',
      explanation: 'With method overloading, multiple methods can have the same name with different parameters.\n\nExpected Output:\nInt: 13\nDouble: 10.56',
      syntax: ['static int Method(int x) { ... }', 'static double Method(double x) { ... }']
    };
  }
  if (/return value/.test(t)) {
    return {
      title: 'C# Method Return Values',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static int Add(int x, int y) {\n    return x + y;\n  }\n  static void Main() {\n    int z = Add(5, 3);\n    Console.WriteLine("Result: " + z);\n  }\n}',
      explanation: 'The void keyword indicates that the method should not return a value. To return a value, specify a primitive type.\n\nExpected Output:\nResult: 8',
      syntax: ['static returnType MethodName(...) { return value; }']
    };
  }
  if (/method parameter|parameter/.test(t)) {
    return {
      title: 'C# Method Parameters',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void MyMethod(string fname, int age) {\n    Console.WriteLine(fname + " is " + age);\n  }\n  static void Main() {\n    MyMethod("Liam", 5);\n    MyMethod("Jenny", 8);\n  }\n}',
      explanation: 'Information can be passed to methods as parameters. Parameters act as variables inside the method.\n\nExpected Output:\nLiam is 5\nJenny is 8',
      syntax: ['static void MethodName(type param1, type param2) { ... }']
    };
  }
  if (/method/.test(t)) {
    return {
      title: 'C# Methods',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void MyMethod() {\n    Console.WriteLine("I just got executed!");\n  }\n  static void Main() {\n    MyMethod();\n    MyMethod();\n  }\n}',
      explanation: 'A method is a block of code which only runs when it is called. static means the method belongs to Program class.\n\nExpected Output:\nI just got executed!\nI just got executed!',
      syntax: ['static void MyMethod() { ... }']
    };
  }
  if (/class member/.test(t)) {
    return {
      title: 'C# Class Members (Fields & Methods)',
      language: 'csharp',
      code: 'using System;\n\nclass Car {\n  string color = "red";\n  int maxSpeed = 200;\n  public void FullThrottle() {\n    Console.WriteLine("The car is going as fast as it can!");\n  }\n  static void Main(string[] args) {\n    Car myObj = new Car();\n    Console.WriteLine(myObj.color);\n    myObj.FullThrottle();\n  }\n}',
      explanation: 'Fields and methods inside classes are often referred to as "Class Members".\n\nExpected Output:\nred\nThe car is going as fast as it can!',
      syntax: ['class Car { string color; void Method() { ... } }']
    };
  }
  if (/constructor/.test(t)) {
    return {
      title: 'C# Constructors',
      language: 'csharp',
      code: 'using System;\n\nclass Car {\n  public string model;\n  public int year;\n  public Car(string modelName, int modelYear) {\n    model = modelName;\n    year = modelYear;\n  }\n  static void Main(string[] args) {\n    Car Ford = new Car("Mustang", 1969);\n    Console.WriteLine(Ford.year + " " + Ford.model);\n  }\n}',
      explanation: 'A constructor is a special method that is used to initialize objects. The constructor is called when an object of a class is created.\n\nExpected Output:\n1969 Mustang',
      syntax: ['public ClassName(params) { ... }']
    };
  }
  if (/access modifier/.test(t)) {
    return {
      title: 'C# Access Modifiers',
      language: 'csharp',
      code: 'using System;\n\nclass Car {\n  private string model = "Mustang"; // accessible only within Car\n  public int year = 1969;           // accessible for all classes\n  static void Main(string[] args) {\n    Car myObj = new Car();\n    Console.WriteLine(myObj.model + " " + myObj.year);\n  }\n}',
      explanation: 'Access modifiers set the access level/visibility for classes, fields, methods and properties (public, private, protected, internal).\n\nExpected Output:\nMustang 1969',
      syntax: ['public int x;', 'private string y;']
    };
  }
  if (/propert/.test(t)) {
    return {
      title: 'C# Properties (get and set)',
      language: 'csharp',
      code: 'using System;\n\nclass Person {\n  private string name; // field\n  public string Name   // property\n  {\n    get { return name; }\n    set { name = value; }\n  }\n}\n\nclass Program {\n  static void Main(string[] args) {\n    Person myObj = new Person();\n    myObj.Name = "Liam";\n    Console.WriteLine("Person name: " + myObj.Name);\n  }\n}',
      explanation: 'A property is like a combination of a variable and a method, with get and set accessors to achieve encapsulation.\n\nExpected Output:\nPerson name: Liam',
      syntax: ['public string Name { get { return name; } set { name = value; } }']
    };
  }
  if (/inheritance/.test(t)) {
    return {
      title: 'C# Inheritance (: operator)',
      language: 'csharp',
      code: 'using System;\n\nclass Vehicle {\n  public string brand = "Ford";\n  public void Honk() {\n    Console.WriteLine("Tuut, tuut!");\n  }\n}\n\nclass Car : Vehicle {\n  public string modelName = "Mustang";\n}\n\nclass Program {\n  static void Main(string[] args) {\n    Car myCar = new Car();\n    myCar.Honk();\n    Console.WriteLine(myCar.brand + " " + myCar.modelName);\n  }\n}',
      explanation: 'In C#, it is possible to inherit fields and methods from one class to another with the : symbol.\n\nExpected Output:\nTuut, tuut!\nFord Mustang',
      syntax: ['class SubClass : BaseClass { ... }']
    };
  }
  if (/polymorphism/.test(t)) {
    return {
      title: 'C# Polymorphism (virtual & override)',
      language: 'csharp',
      code: 'using System;\n\nclass Animal {\n  public virtual void AnimalSound() {\n    Console.WriteLine("The animal makes a sound");\n  }\n}\nclass Pig : Animal {\n  public override void AnimalSound() {\n    Console.WriteLine("The pig says: wee wee");\n  }\n}\nclass Program {\n  static void Main(string[] args) {\n    Animal myAnimal = new Animal();\n    Animal myPig = new Pig();\n    myAnimal.AnimalSound();\n    myPig.AnimalSound();\n  }\n}',
      explanation: 'Polymorphism uses inherited methods to perform different tasks. Use virtual in base and override in derived class.\n\nExpected Output:\nThe animal makes a sound\nThe pig says: wee wee',
      syntax: ['public virtual void Sound() { ... }', 'public override void Sound() { ... }']
    };
  }
  if (/abstraction/.test(t)) {
    return {
      title: 'C# Abstraction (abstract classes)',
      language: 'csharp',
      code: 'using System;\n\nabstract class Animal {\n  public abstract void AnimalSound();\n  public void Sleep() {\n    Console.WriteLine("Zzz");\n  }\n}\nclass Pig : Animal {\n  public override void AnimalSound() {\n    Console.WriteLine("The pig says: wee wee");\n  }\n}\nclass Program {\n  static void Main(string[] args) {\n    Pig myPig = new Pig();\n    myPig.AnimalSound();\n    myPig.Sleep();\n  }\n}',
      explanation: 'Data abstraction is the process of hiding certain details and showing only essential information using abstract classes.\n\nExpected Output:\nThe pig says: wee wee\nZzz',
      syntax: ['abstract class ClassName { public abstract void Method(); }']
    };
  }
  if (/multiple interface/.test(t)) {
    return {
      title: 'C# Multiple Interfaces',
      language: 'csharp',
      code: 'using System;\n\ninterface IFirstInterface {\n  void MyMethod();\n}\ninterface ISecondInterface {\n  void MyOtherMethod();\n}\nclass DemoClass : IFirstInterface, ISecondInterface {\n  public void MyMethod() => Console.WriteLine("Some text..");\n  public void MyOtherMethod() => Console.WriteLine("Some other text...");\n}\nclass Program {\n  static void Main(string[] args) {\n    DemoClass myObj = new DemoClass();\n    myObj.MyMethod();\n    myObj.MyOtherMethod();\n  }\n}',
      explanation: 'To implement multiple interfaces, separate them with a comma.\n\nExpected Output:\nSome text..\nSome other text...',
      syntax: ['class ClassName : IInterface1, IInterface2 { ... }']
    };
  }
  if (/interface/.test(t)) {
    return {
      title: 'C# Interface',
      language: 'csharp',
      code: 'using System;\n\ninterface IAnimal {\n  void AnimalSound();\n}\nclass Pig : IAnimal {\n  public void AnimalSound() {\n    Console.WriteLine("The pig says: wee wee");\n  }\n}\nclass Program {\n  static void Main(string[] args) {\n    Pig myPig = new Pig();\n    myPig.AnimalSound();\n  }\n}',
      explanation: 'An interface is a completely "abstract class", which can only contain abstract methods and properties.\n\nExpected Output:\nThe pig says: wee wee',
      syntax: ['interface IInterfaceName { void Method(); }']
    };
  }
  if (/enum/.test(t)) {
    return {
      title: 'C# Enums',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  enum Level {\n    Low,\n    Medium,\n    High\n  }\n  static void Main(string[] args) {\n    Level myVar = Level.Medium;\n    Console.WriteLine("Selected level: " + myVar);\n    Console.WriteLine("Numeric value: " + (int)myVar);\n  }\n}',
      explanation: 'An enum is a special "class" that represents a group of constants (unchangeable/read-only variables).\n\nExpected Output:\nSelected level: Medium\nNumeric value: 1',
      syntax: ['enum Level { Low, Medium, High }']
    };
  }
  if (/file/.test(t)) {
    return {
      title: 'C# File Handling (System.IO)',
      language: 'csharp',
      code: 'using System;\nusing System.IO;\n\nclass Program {\n  static void Main() {\n    string writeText = "Hello World from C# File System!";\n    File.WriteAllText("filename.txt", writeText);\n    string readText = File.ReadAllText("filename.txt");\n    Console.WriteLine(readText);\n  }\n}',
      explanation: 'The File class from the System.IO namespace allows us to work with files on the filesystem.\n\nExpected Output:\nHello World from C# File System!',
      syntax: ['File.WriteAllText(path, text);', 'File.ReadAllText(path);']
    };
  }
  if (/exception|error/.test(t)) {
    return {
      title: 'C# Exceptions (try...catch...finally)',
      language: 'csharp',
      code: 'using System;\n\nclass Program {\n  static void Main() {\n    try {\n      int[] myNumbers = {1, 2, 3};\n      Console.WriteLine(myNumbers[10]);\n    } catch (Exception e) {\n      Console.WriteLine("Error caught: " + e.Message);\n    } finally {\n      Console.WriteLine("The \'try catch\' block is finished.");\n    }\n  }\n}',
      explanation: 'The try statement allows you to define a block of code to be tested for errors while it is being executed.\n\nExpected Output:\nError caught: Index was outside the bounds of the array.\nThe \'try catch\' block is finished.',
      syntax: ['try { ... } catch (Exception e) { ... } finally { ... }']
    };
  }
  if (/class|oop|object/.test(t)) {
    return {
      title: 'C# Classes and Objects',
      language: 'csharp',
      code: 'using System;\n\nclass Car {\n  string color = "red";\n  static void Main(string[] args) {\n    Car myObj1 = new Car();\n    Car myObj2 = new Car();\n    Console.WriteLine(myObj1.color);\n    Console.WriteLine(myObj2.color);\n  }\n}',
      explanation: 'C# is an object-oriented language. A Class is like an object constructor, or a "blueprint" for creating objects.\n\nExpected Output:\nred\nred',
      syntax: ['class ClassName { ... }', 'ClassName obj = new ClassName();']
    };
  }

  return {
    title: 'C# Program Output',
    language: 'csharp',
    code: 'using System;\n\nnamespace LectureApp {\n  class Program {\n    static void Main(string[] args) {\n      int a = 15, b = 25;\n      Console.WriteLine($"Result: {a + b}");\n    }\n  }\n}',
    explanation: 'Basic executable C# program showcasing namespaces, class definition, and formatted console output.\n\nExpected Output:\nResult: 40',
    syntax: ['Console.WriteLine(value);']
  };
}
