import type { ExampleSnippet } from './types.js';

export function getJavaExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  if (/fileoutputstream/.test(t)) {
    return {
      title: 'Java FileOutputStream',
      language: 'java',
      code: 'import java.io.FileOutputStream;\n\npublic class Main {\n  public static void main(String[] args) {\n    try {\n      FileOutputStream out = new FileOutputStream("test.txt");\n      String s = "Hello FileOutputStream";\n      byte[] b = s.getBytes();\n      out.write(b);\n      out.close();\n      System.out.println("Bytes written successfully.");\n    } catch (Exception e) {\n      System.out.println("I/O Error: " + e.getMessage());\n    }\n  }\n}',
      explanation: 'Java FileOutputStream is an output stream used for writing data to a file (in bytes).\n\nExpected Output:\nBytes written successfully.',
      syntax: ['FileOutputStream out = new FileOutputStream("path");', 'out.write(byteArr);']
    };
  }
  if (/fileinputstream/.test(t)) {
    return {
      title: 'Java FileInputStream',
      language: 'java',
      code: 'import java.io.FileInputStream;\n\npublic class Main {\n  public static void main(String[] args) {\n    try {\n      FileInputStream in = new FileInputStream("test.txt");\n      int i = in.read();\n      System.out.println("First byte read: " + (char)i);\n      in.close();\n    } catch (Exception e) {\n      System.out.println("I/O Error: " + e.getMessage());\n    }\n  }\n}',
      explanation: 'Java FileInputStream obtains input bytes from a file. It is used for reading byte-oriented data such as image data, audio, video etc.\n\nExpected Output:\nFirst byte read: H',
      syntax: ['FileInputStream in = new FileInputStream("path");', 'in.read();']
    };
  }
  if (/bufferedreader/.test(t)) {
    return {
      title: 'Java BufferedReader',
      language: 'java',
      code: 'import java.io.BufferedReader;\nimport java.io.FileReader;\n\npublic class Main {\n  public static void main(String[] args) {\n    try {\n      BufferedReader reader = new BufferedReader(new FileReader("test.txt"));\n      String line = reader.readLine();\n      System.out.println("Buffered line: " + line);\n      reader.close();\n    } catch (Exception e) {\n      System.out.println("Reader error: " + e.getMessage());\n    }\n  }\n}',
      explanation: 'Java BufferedReader reads text from a character-input stream, buffering characters so as to provide for the efficient reading of sequence of characters.\n\nExpected Output:\nBuffered line: Hello FileOutputStream',
      syntax: ['BufferedReader br = new BufferedReader(new FileReader("file.txt"));']
    };
  }
  if (/bufferedwriter/.test(t)) {
    return {
      title: 'Java BufferedWriter',
      language: 'java',
      code: 'import java.io.BufferedWriter;\nimport java.io.FileWriter;\n\npublic class Main {\n  public static void main(String[] args) {\n    try {\n      BufferedWriter writer = new BufferedWriter(new FileWriter("output.txt"));\n      writer.write("Writing buffered characters efficiently.");\n      writer.close();\n      System.out.println("BufferedWriter completed successfully.");\n    } catch (Exception e) {\n      System.out.println("Writer error: " + e.getMessage());\n    }\n  }\n}',
      explanation: 'Java BufferedWriter writes text to a character-output stream, buffering characters to provide efficient writing.\n\nExpected Output:\nBufferedWriter completed successfully.',
      syntax: ['BufferedWriter bw = new BufferedWriter(new FileWriter("file.txt"));']
    };
  }
  if (/home|intro|get started|syntax|\boutput\b/.test(t)) {
    return {
      title: 'Java Output & Main Method',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello World");\n  }\n}',
      explanation: 'Every line of code that runs in Java must be inside a class. The main() method is required and you will see it in every Java program.\n\nExpected Output:\nHello World',
      syntax: ['public class Main { public static void main(String[] args) { System.out.println(...); } }']
    };
  }
  if (/statement/.test(t)) {
    return {
      title: 'Java Statements',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello World!");\n    System.out.println("Have a good day!");\n  }\n}',
      explanation: 'A computer program is a list of "instructions" to be executed by a computer. In Java, each statement ends with a semicolon.\n\nExpected Output:\nHello World!\nHave a good day!',
      syntax: ['System.out.println(text);']
    };
  }
  if (/comment/.test(t)) {
    return {
      title: 'Java Comments',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    // This is a single-line comment\n    System.out.println("Comments are ignored by the Java compiler");\n    /* Multi-line comments\n       span multiple lines */\n  }\n}',
      explanation: 'Comments can be used to explain Java code, and to make it more readable.\n\nExpected Output:\nComments are ignored by the Java compiler',
      syntax: ['// Single-line comment', '/* Multi-line comment */']
    };
  }
  if (/data type/.test(t)) {
    return {
      title: 'Java Data Types',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    int myNum = 5;               // Integer\n    float myFloatNum = 5.99f;    // Floating point number\n    char myLetter = \'D\';         // Character\n    boolean myBool = true;       // Boolean\n    String myText = "Hello";     // String\n    System.out.println(myNum + " " + myFloatNum + " " + myLetter + " " + myBool + " " + myText);\n  }\n}',
      explanation: 'Data types in Java are divided into primitive data types (byte, short, int, long, float, double, boolean, char) and non-primitive types.\n\nExpected Output:\n5 5.99 D true Hello',
      syntax: ['int num = 5;', 'float f = 5.99f;', 'char c = \'A\';', 'boolean b = true;']
    };
  }
  if (/variable/.test(t)) {
    return {
      title: 'Java Variables & Assignment',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    String name = "John";\n    int myNum = 15;\n    myNum = 20; // myNum is now 20\n    System.out.println(name + " has " + myNum + " points.");\n  }\n}',
      explanation: 'Variables are containers for storing data values. In Java, there are different types of variables.\n\nExpected Output:\nJohn has 20 points.',
      syntax: ['type variableName = value;']
    };
  }
  if (/type casting|casting/.test(t)) {
    return {
      title: 'Java Type Casting (Widening and Narrowing)',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    // Widening casting (automatic)\n    int myInt = 9;\n    double myDouble = myInt;\n    System.out.println("Widening: " + myDouble);\n\n    // Narrowing casting (manual)\n    double pi = 9.78d;\n    int intPi = (int) pi;\n    System.out.println("Narrowing: " + intPi);\n  }\n}',
      explanation: 'Type casting is when you assign a value of one primitive data type to another type. Widening is automatic; narrowing requires an explicit cast.\n\nExpected Output:\nWidening: 9.0\nNarrowing: 9',
      syntax: ['double d = myInt; // Automatic', 'int i = (int) myDouble; // Manual']
    };
  }
  if (/operator/.test(t)) {
    return {
      title: 'Java Operators',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    int sum1 = 100 + 50;\n    int sum2 = sum1 + 250;\n    int sum3 = sum2 * 2;\n    boolean isGreater = sum3 > 500;\n    System.out.println("sum1: " + sum1 + ", sum2: " + sum2 + ", isGreater: " + isGreater);\n  }\n}',
      explanation: 'Operators are used to perform operations on variables and values (+, -, *, /, %, ++, --, &&, ||).\n\nExpected Output:\nsum1: 150, sum2: 400, isGreater: True',
      syntax: ['int z = x + y;', 'boolean b = x > y;']
    };
  }
  if (/string/.test(t)) {
    return {
      title: 'Java Strings & Methods',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    String txt = "Hello World";\n    System.out.println("Length: " + txt.length());\n    System.out.println("Uppercase: " + txt.toUpperCase());\n    System.out.println("Index of W: " + txt.indexOf("W"));\n    System.out.println("Substring: " + txt.substring(0, 5));\n  }\n}',
      explanation: 'A String in Java is actually an object, which contains methods that can perform operations on strings.\n\nExpected Output:\nLength: 11\nUppercase: HELLO WORLD\nIndex of W: 6\nSubstring: Hello',
      syntax: ['str.length()', 'str.toUpperCase()', 'str.indexOf("sub")', 'str.substring(start, end)']
    };
  }
  if (/math/.test(t)) {
    return {
      title: 'Java Math Class',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Max: " + Math.max(5, 10));\n    System.out.println("Min: " + Math.min(5, 10));\n    System.out.println("Sqrt: " + Math.sqrt(64));\n    System.out.println("Abs: " + Math.abs(-4.7));\n    System.out.println("Random: " + (int)(Math.random() * 101));\n  }\n}',
      explanation: 'The Java Math class has many methods that allow you to perform mathematical tasks on numbers.\n\nExpected Output:\nMax: 10\nMin: 5\nSqrt: 8.0\nAbs: 4.7\nRandom: (integer between 0 and 100)',
      syntax: ['Math.max(x, y)', 'Math.sqrt(x)', 'Math.abs(x)']
    };
  }
  if (/boolean/.test(t)) {
    return {
      title: 'Java Booleans',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    boolean isJavaFun = true;\n    boolean isFishTasty = false;\n    System.out.println(isJavaFun);\n    System.out.println(isFishTasty);\n    int x = 10, y = 9;\n    System.out.println(x > y); // Returns true\n  }\n}',
      explanation: 'A boolean type is declared with the boolean keyword and can only take the values true or false.\n\nExpected Output:\ntrue\nfalse\ntrue',
      syntax: ['boolean myBool = true;', 'x > y']
    };
  }
  if (/if\.\.\.else|if/.test(t)) {
    return {
      title: 'Java If...Else Conditionals',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    int time = 22;\n    if (time < 10) {\n      System.out.println("Good morning.");\n    } else if (time < 20) {\n      System.out.println("Good day.");\n    } else {\n      System.out.println("Good evening.");\n    }\n  }\n}',
      explanation: 'Java conditions and If-Else statements execute different blocks of code depending on logical conditions.\n\nExpected Output:\nGood evening.',
      syntax: ['if (condition) { ... } else if (condition) { ... } else { ... }']
    };
  }
  if (/switch/.test(t)) {
    return {
      title: 'Java Switch Statement',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    int day = 4;\n    switch (day) {\n      case 1:\n        System.out.println("Monday");\n        break;\n      case 4:\n        System.out.println("Thursday");\n        break;\n      default:\n        System.out.println("Looking forward to the Weekend");\n        break;\n    }\n  }\n}',
      explanation: 'Use the switch statement to select one of many code blocks to be executed.\n\nExpected Output:\nThursday',
      syntax: ['switch(expression) { case x: ... break; default: ... break; }']
    };
  }
  if (/while/.test(t)) {
    return {
      title: 'Java While Loop',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    int i = 0;\n    while (i < 5) {\n      System.out.println("While: " + i);\n      i++;\n    }\n  }\n}',
      explanation: 'Loops can execute a block of code as long as a specified condition is reached.\n\nExpected Output:\nWhile: 0\nWhile: 1\nWhile: 2\nWhile: 3\nWhile: 4',
      syntax: ['while (condition) { ... i++; }']
    };
  }
  if (/for loop|for/.test(t)) {
    return {
      title: 'Java For Loop',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    for (int i = 0; i < 5; i++) {\n      System.out.println("Count: " + i);\n    }\n  }\n}',
      explanation: 'When you know exactly how many times you want to loop through a block of code, use the for loop.\n\nExpected Output:\nCount: 0\nCount: 1\nCount: 2\nCount: 3\nCount: 4',
      syntax: ['for (statement 1; statement 2; statement 3) { ... }']
    };
  }
  if (/break|continue/.test(t)) {
    return {
      title: 'Java Break and Continue',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    for (int i = 0; i < 10; i++) {\n      if (i == 4) continue; // Skip 4\n      if (i == 7) break;    // Stop at 7\n      System.out.println("i = " + i);\n    }\n  }\n}',
      explanation: 'The break statement jumps out of a loop. The continue statement breaks one iteration and continues with the next.\n\nExpected Output:\ni = 0\ni = 1\ni = 2\ni = 3\ni = 5\ni = 6',
      syntax: ['if (cond) break;', 'if (cond) continue;']
    };
  }
  if (/array/.test(t)) {
    return {
      title: 'Java Arrays',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    String[] cars = {"Volvo", "BMW", "Ford", "Mazda"};\n    cars[0] = "Opel";\n    System.out.println("First car: " + cars[0]);\n    System.out.println("Total cars: " + cars.length);\n  }\n}',
      explanation: 'Arrays are used to store multiple values in a single variable, instead of declaring separate variables for each value.\n\nExpected Output:\nFirst car: Opel\nTotal cars: 4',
      syntax: ['type[] arrayName = {"val1", "val2"};', 'arrayName[index]']
    };
  }
  if (/method parameter|parameter/.test(t)) {
    return {
      title: 'Java Method Parameters',
      language: 'java',
      code: 'public class Main {\n  static void myMethod(String fname, int age) {\n    System.out.println(fname + " is " + age);\n  }\n  public static void main(String[] args) {\n    myMethod("Liam", 5);\n    myMethod("Jenny", 8);\n  }\n}',
      explanation: 'Parameters act as variables inside the method. You can add as many parameters as you want, separated with a comma.\n\nExpected Output:\nLiam is 5\nJenny is 8',
      syntax: ['static void methodName(type param1, type param2) { ... }']
    };
  }
  if (/method overloading|overload/.test(t)) {
    return {
      title: 'Java Method Overloading',
      language: 'java',
      code: 'public class Main {\n  static int plusMethod(int x, int y) {\n    return x + y;\n  }\n  static double plusMethod(double x, double y) {\n    return x + y;\n  }\n  public static void main(String[] args) {\n    int myNum1 = plusMethod(8, 5);\n    double myNum2 = plusMethod(4.3, 6.26);\n    System.out.println("int: " + myNum1);\n    System.out.println("double: " + myNum2);\n  }\n}',
      explanation: 'With method overloading, multiple methods can have the same name with different parameters.\n\nExpected Output:\nint: 13\ndouble: 10.56',
      syntax: ['static int plus(int x, int y);', 'static double plus(double x, double y);']
    };
  }
  if (/scope/.test(t)) {
    return {
      title: 'Java Variable Scope',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    // Method scope\n    int x = 100;\n    System.out.println("Method scope x: " + x);\n\n    // Block scope\n    {\n      int y = 200;\n      System.out.println("Block scope y: " + y);\n    }\n    // y cannot be used here\n  }\n}',
      explanation: 'In Java, variables are only accessible inside the region they are created. This is called scope (method or block scope).\n\nExpected Output:\nMethod scope x: 100\nBlock scope y: 200',
      syntax: ['{ /* Block scope */ }']
    };
  }
  if (/recursion/.test(t)) {
    return {
      title: 'Java Recursion',
      language: 'java',
      code: 'public class Main {\n  public static int sum(int k) {\n    if (k > 0) {\n      return k + sum(k - 1);\n    } else {\n      return 0;\n    }\n  }\n  public static void main(String[] args) {\n    int result = sum(10);\n    System.out.println("Sum 1 to 10: " + result);\n  }\n}',
      explanation: 'Recursion is the technique of making a function call itself, which provides a way to break complicated problems into simple ones.\n\nExpected Output:\nSum 1 to 10: 55',
      syntax: ['return k + sum(k - 1);']
    };
  }
  if (/hashmap method/.test(t)) {
    return {
      title: 'Java HashMap Methods',
      language: 'java',
      code: 'import java.util.HashMap;\n\npublic class Main {\n  public static void main(String[] args) {\n    HashMap<String, String> map = new HashMap<>();\n    map.put("key1", "val1");\n    System.out.println("Contains key1? " + map.containsKey("key1"));\n    System.out.println("Removed: " + map.remove("key1"));\n    System.out.println("Is empty? " + map.isEmpty());\n  }\n}',
      explanation: 'Java HashMap provides methods like put(), get(), remove(), containsKey(), containsValue(), and clear().\n\nExpected Output:\nContains key1? true\nRemoved: val1\nIs empty? true',
      syntax: ['map.containsKey(key)', 'map.remove(key)', 'map.isEmpty()']
    };
  }
  if (/scanner method/.test(t)) {
    return {
      title: 'Java Scanner Methods',
      language: 'java',
      code: 'import java.util.Scanner;\n\npublic class Main {\n  public static void main(String[] args) {\n    String s = "Hello 100 true";\n    Scanner scanner = new Scanner(s);\n    System.out.println("Word: " + scanner.next());\n    System.out.println("Int: " + scanner.nextInt());\n    System.out.println("Boolean: " + scanner.nextBoolean());\n    scanner.close();\n  }\n}',
      explanation: 'Java Scanner methods include nextLine(), nextInt(), nextDouble(), nextBoolean(), and hasNext().\n\nExpected Output:\nWord: Hello\nInt: 100\nBoolean: true',
      syntax: ['scanner.next()', 'scanner.nextInt()', 'scanner.hasNext()']
    };
  }
  if (/file method/.test(t)) {
    return {
      title: 'Java File Methods',
      language: 'java',
      code: 'import java.io.File;\n\npublic class Main {\n  public static void main(String[] args) {\n    File f = new File("test.txt");\n    System.out.println("Exists: " + f.exists());\n    System.out.println("Can read: " + f.canRead());\n    System.out.println("Is file: " + f.isFile());\n  }\n}',
      explanation: 'File methods in Java include exists(), canRead(), canWrite(), isFile(), isDirectory(), and length().\n\nExpected Output:\nExists: true\nCan read: true\nIs file: true',
      syntax: ['f.exists()', 'f.canRead()', 'f.isFile()']
    };
  }
  if (/iterator method/.test(t)) {
    return {
      title: 'Java Iterator Methods',
      language: 'java',
      code: 'import java.util.ArrayList;\nimport java.util.Iterator;\n\npublic class Main {\n  public static void main(String[] args) {\n    ArrayList<Integer> nums = new ArrayList<>();\n    nums.add(10);\n    nums.add(20);\n    Iterator<Integer> it = nums.iterator();\n    System.out.println("Has next: " + it.hasNext());\n    System.out.println("Next val: " + it.next());\n  }\n}',
      explanation: 'Iterator methods in Java allow safe iteration: hasNext() checks for elements, next() advances, remove() removes items.\n\nExpected Output:\nHas next: true\nNext val: 10',
      syntax: ['it.hasNext()', 'it.next()', 'it.remove()']
    };
  }
  if (/collections method/.test(t)) {
    return {
      title: 'Java Collections Methods',
      language: 'java',
      code: 'import java.util.ArrayList;\nimport java.util.Collections;\n\npublic class Main {\n  public static void main(String[] args) {\n    ArrayList<String> letters = new ArrayList<>();\n    letters.add("Z");\n    letters.add("A");\n    letters.add("M");\n    Collections.sort(letters);\n    System.out.println("Sorted: " + letters);\n    System.out.println("Max: " + Collections.max(letters));\n  }\n}',
      explanation: 'Collections utility methods provide static algorithms: sort(), reverse(), shuffle(), min(), max(), binarySearch().\n\nExpected Output:\nSorted: [A, M, Z]\nMax: Z',
      syntax: ['Collections.sort(list);', 'Collections.max(list);']
    };
  }
  if (/system method/.test(t)) {
    return {
      title: 'Java System Methods',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    long millis = System.currentTimeMillis();\n    System.out.println("Current time valid: " + (millis > 0));\n    System.out.println("OS: " + System.getProperty("os.name"));\n  }\n}',
      explanation: 'The System class contains several useful class fields and methods: currentTimeMillis(), nanoTime(), exit(), getProperty().\n\nExpected Output:\nCurrent time valid: true\nOS: (operating system name)',
      syntax: ['System.currentTimeMillis()', 'System.getProperty("key")']
    };
  }
  if (/linkedlist method/.test(t)) {
    return {
      title: 'Java LinkedList Methods',
      language: 'java',
      code: 'import java.util.LinkedList;\n\npublic class Main {\n  public static void main(String[] args) {\n    LinkedList<String> cars = new LinkedList<>();\n    cars.add("Volvo");\n    cars.addFirst("BMW");\n    cars.addLast("Ford");\n    System.out.println("First: " + cars.getFirst());\n    System.out.println("Last: " + cars.getLast());\n  }\n}',
      explanation: 'LinkedList provides special methods for queue/deque operations: addFirst(), addLast(), removeFirst(), getFirst().\n\nExpected Output:\nFirst: BMW\nLast: Ford',
      syntax: ['list.addFirst(val)', 'list.addLast(val)', 'list.getFirst()']
    };
  }
  if (/class method/.test(t)) {
    return {
      title: 'Java Class Methods (Static vs Public)',
      language: 'java',
      code: 'public class Main {\n  static void myStaticMethod() {\n    System.out.println("Static methods can be called without creating objects");\n  }\n  public void myPublicMethod() {\n    System.out.println("Public methods must be called by creating objects");\n  }\n  public static void main(String[] args) {\n    myStaticMethod();\n    Main myObj = new Main();\n    myObj.myPublicMethod();\n  }\n}',
      explanation: 'Static methods can be accessed without creating an object of the class, whereas public methods can only be accessed by objects.\n\nExpected Output:\nStatic methods can be called without creating objects\nPublic methods must be called by creating objects',
      syntax: ['static void myStaticMethod()', 'public void myPublicMethod()']
    };
  }
  if (/method/.test(t)) {
    return {
      title: 'Java Methods',
      language: 'java',
      code: 'public class Main {\n  static void myMethod() {\n    System.out.println("I just got executed!");\n  }\n  public static void main(String[] args) {\n    myMethod();\n    myMethod();\n  }\n}',
      explanation: 'A method is a block of code which only runs when it is called. static means the method belongs to Main class.\n\nExpected Output:\nI just got executed!\nI just got executed!',
      syntax: ['static void myMethod() { ... }']
    };
  }
  if (/class attribute|attribute/.test(t)) {
    return {
      title: 'Java Class Attributes (Fields)',
      language: 'java',
      code: 'public class Main {\n  int x = 5;\n  final double PI = 3.14;\n  public static void main(String[] args) {\n    Main myObj = new Main();\n    myObj.x = 25; // modify attribute\n    System.out.println("Modified x: " + myObj.x);\n    System.out.println("Constant PI: " + myObj.PI);\n  }\n}',
      explanation: 'Variables inside a class are called attributes or fields. The final keyword creates unchangeable constants.\n\nExpected Output:\nModified x: 25\nConstant PI: 3.14',
      syntax: ['class Main { int x = 5; final double PI = 3.14; }']
    };
  }
  if (/constructor/.test(t)) {
    return {
      title: 'Java Constructors',
      language: 'java',
      code: 'public class Main {\n  int modelYear;\n  String modelName;\n\n  public Main(int year, String name) {\n    modelYear = year;\n    modelName = name;\n  }\n\n  public static void main(String[] args) {\n    Main myCar = new Main(1969, "Mustang");\n    System.out.println(myCar.modelYear + " " + myCar.modelName);\n  }\n}',
      explanation: 'A constructor in Java is a special method that is used to initialize objects when created.\n\nExpected Output:\n1969 Mustang',
      syntax: ['public ClassName(params) { ... }']
    };
  }
  if (/this keyword/.test(t)) {
    return {
      title: 'Java this Keyword',
      language: 'java',
      code: 'public class Main {\n  int x;\n  public Main(int x) {\n    this.x = x; // "this" refers to the current class instance attribute\n  }\n  public static void main(String[] args) {\n    Main myObj = new Main(5);\n    System.out.println("Value of x = " + myObj.x);\n  }\n}',
      explanation: 'The this keyword refers to the current object in a method or constructor, eliminating confusion between attributes and parameters.\n\nExpected Output:\nValue of x = 5',
      syntax: ['this.attributeName = parameterName;']
    };
  }
  if (/modifier/.test(t)) {
    return {
      title: 'Java Modifiers (Access & Non-Access)',
      language: 'java',
      code: 'public class Main {\n  final int x = 10; // final: cannot be overridden\n  static void myStaticMethod() {\n    System.out.println("Static methods can be called without creating an object");\n  }\n  public static void main(String[] args) {\n    myStaticMethod();\n  }\n}',
      explanation: 'Java modifiers set access controls (public, private, protected) or non-access traits (final, static, abstract).\n\nExpected Output:\nStatic methods can be called without creating an object',
      syntax: ['public static final int x = 10;']
    };
  }
  if (/encapsulation/.test(t)) {
    return {
      title: 'Java Encapsulation (Getters and Setters)',
      language: 'java',
      code: 'public class Person {\n  private String name; // private: restricted access\n\n  public String getName() {\n    return name;\n  }\n  public void setName(String newName) {\n    this.name = newName;\n  }\n  public static void main(String[] args) {\n    Person p = new Person();\n    p.setName("John");\n    System.out.println("Person name: " + p.getName());\n  }\n}',
      explanation: 'Encapsulation ensures sensitive data is hidden from users using private variables and public getters/setters.\n\nExpected Output:\nPerson name: John',
      syntax: ['private type var;', 'public type getVar() { return var; }']
    };
  }
  if (/package/.test(t)) {
    return {
      title: 'Java Packages & Import',
      language: 'java',
      code: 'import java.util.Scanner;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner myObj = new Scanner(System.in);\n    System.out.println("Package java.util imported successfully with Scanner class.");\n  }\n}',
      explanation: 'A package in Java is used to group related classes. Think of it as a folder in a file directory.\n\nExpected Output:\nPackage java.util imported successfully with Scanner class.',
      syntax: ['package mypack;', 'import java.util.Scanner;']
    };
  }
  if (/super keyword/.test(t)) {
    return {
      title: 'Java super Keyword',
      language: 'java',
      code: 'class Animal {\n  public void animalSound() {\n    System.out.println("The animal makes a sound");\n  }\n}\nclass Dog extends Animal {\n  public void animalSound() {\n    super.animalSound(); // Call the superclass method\n    System.out.println("The dog says: bow wow");\n  }\n}\npublic class Main {\n  public static void main(String[] args) {\n    Dog myDog = new Dog();\n    myDog.animalSound();\n  }\n}',
      explanation: 'The super keyword refers to superclass (parent) objects and is used to call superclass methods or constructors.\n\nExpected Output:\nThe animal makes a sound\nThe dog says: bow wow',
      syntax: ['super.methodName();', 'super();']
    };
  }
  if (/inner class|anonymous class/.test(t)) {
    return {
      title: 'Java Inner Classes',
      language: 'java',
      code: 'class OuterClass {\n  int x = 10;\n  class InnerClass {\n    int y = 5;\n  }\n}\npublic class Main {\n  public static void main(String[] args) {\n    OuterClass myOuter = new OuterClass();\n    OuterClass.InnerClass myInner = myOuter.new InnerClass();\n    System.out.println("Sum: " + (myInner.y + myOuter.x));\n  }\n}',
      explanation: 'In Java, it is possible to nest classes (a class within a class). The purpose of nested classes is to group classes that belong together.\n\nExpected Output:\nSum: 15',
      syntax: ['OuterClass.InnerClass myInner = myOuter.new InnerClass();']
    };
  }
  if (/inheritance/.test(t)) {
    return {
      title: 'Java Inheritance (extends keyword)',
      language: 'java',
      code: 'class Vehicle {\n  protected String brand = "Ford";\n  public void honk() {\n    System.out.println("Tuut, tuut!");\n  }\n}\n\nclass Car extends Vehicle {\n  private String modelName = "Mustang";\n  public static void main(String[] args) {\n    Car myCar = new Car();\n    myCar.honk();\n    System.out.println(myCar.brand + " " + myCar.modelName);\n  }\n}',
      explanation: 'In Java, it is possible to inherit attributes and methods from one class to another with the extends keyword.\n\nExpected Output:\nTuut, tuut!\nFord Mustang',
      syntax: ['class Subclass extends Superclass { ... }']
    };
  }
  if (/polymorphism/.test(t)) {
    return {
      title: 'Java Polymorphism',
      language: 'java',
      code: 'class Animal {\n  public void animalSound() {\n    System.out.println("The animal makes a sound");\n  }\n}\nclass Pig extends Animal {\n  public void animalSound() {\n    System.out.println("The pig says: wee wee");\n  }\n}\npublic class Main {\n  public static void main(String[] args) {\n    Animal myAnimal = new Animal();\n    Animal myPig = new Pig();\n    myAnimal.animalSound();\n    myPig.animalSound();\n  }\n}',
      explanation: 'Polymorphism uses inherited methods to perform different tasks, allowing us to perform a single action in different ways.\n\nExpected Output:\nThe animal makes a sound\nThe pig says: wee wee',
      syntax: ['Animal myPig = new Pig();', 'myPig.animalSound();']
    };
  }
  if (/abstraction/.test(t)) {
    return {
      title: 'Java Abstraction (abstract class)',
      language: 'java',
      code: 'abstract class Animal {\n  public abstract void animalSound();\n  public void sleep() {\n    System.out.println("Zzz");\n  }\n}\nclass Pig extends Animal {\n  public void animalSound() {\n    System.out.println("The pig says: wee wee");\n  }\n}\npublic class Main {\n  public static void main(String[] args) {\n    Pig myPig = new Pig();\n    myPig.animalSound();\n    myPig.sleep();\n  }\n}',
      explanation: 'Data abstraction is the process of hiding certain details and showing only essential information using abstract classes and methods.\n\nExpected Output:\nThe pig says: wee wee\nZzz',
      syntax: ['abstract class ClassName { abstract void sound(); }']
    };
  }
  if (/interface/.test(t)) {
    return {
      title: 'Java Interfaces',
      language: 'java',
      code: 'interface Animal {\n  public void animalSound();\n  public void sleep();\n}\n\nclass Pig implements Animal {\n  public void animalSound() {\n    System.out.println("The pig says: wee wee");\n  }\n  public void sleep() {\n    System.out.println("Zzz");\n  }\n}\n\npublic class Main {\n  public static void main(String[] args) {\n    Pig myPig = new Pig();\n    myPig.animalSound();\n    myPig.sleep();\n  }\n}',
      explanation: 'An interface is a completely "abstract class" that is used to group related methods with empty bodies.\n\nExpected Output:\nThe pig says: wee wee\nZzz',
      syntax: ['interface InterfaceName { ... }', 'class Impl implements InterfaceName { ... }']
    };
  }
  if (/enum/.test(t)) {
    return {
      title: 'Java Enums',
      language: 'java',
      code: 'enum Level {\n  LOW,\n  MEDIUM,\n  HIGH\n}\npublic class Main {\n  public static void main(String[] args) {\n    Level myVar = Level.MEDIUM;\n    System.out.println("Enum value: " + myVar);\n  }\n}',
      explanation: 'An enum is a special "class" that represents a group of constants (unchangeable variables, like final variables).\n\nExpected Output:\nEnum value: MEDIUM',
      syntax: ['enum Level { LOW, MEDIUM, HIGH }', 'Level myVar = Level.MEDIUM;']
    };
  }
  if (/user input|scanner/.test(t)) {
    return {
      title: 'Java Scanner (User Input)',
      language: 'java',
      code: 'import java.util.Scanner;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner myObj = new Scanner(System.in);\n    System.out.println("Enter username:");\n    String userName = myObj.nextLine();\n    System.out.println("Username is: " + userName);\n  }\n}',
      explanation: 'The Scanner class is used to get user input, and it is found in the java.util package.\n\nExpected Output:\nEnter username:\nUsername is: (input text)',
      syntax: ['Scanner scanner = new Scanner(System.in);', 'scanner.nextLine();']
    };
  }
  if (/date|time/.test(t)) {
    return {
      title: 'Java Date & Time (java.time)',
      language: 'java',
      code: 'import java.time.LocalDateTime;\nimport java.time.format.DateTimeFormatter;\n\npublic class Main {\n  public static void main(String[] args) {\n    LocalDateTime myDateObj = LocalDateTime.now();\n    DateTimeFormatter myFormatObj = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss");\n    String formattedDate = myDateObj.format(myFormatObj);\n    System.out.println("Formatted Date: " + formattedDate);\n  }\n}',
      explanation: 'Java does not have a built-in Date class, but we can import the java.time package to work with the date and time API.\n\nExpected Output:\nFormatted Date: (current formatted date/time)',
      syntax: ['LocalDateTime.now()', 'DateTimeFormatter.ofPattern(...)']
    };
  }
  if (/try-with-resources/.test(t)) {
    return {
      title: 'Java try-with-resources',
      language: 'java',
      code: 'import java.io.FileWriter;\nimport java.io.IOException;\n\npublic class Main {\n  public static void main(String[] args) {\n    try (FileWriter writer = new FileWriter("resources_demo.txt")) {\n      writer.write("try-with-resources automatically closes resources!");\n      System.out.println("File write complete, writer closed automatically.");\n    } catch (IOException e) {\n      System.out.println("I/O Exception: " + e.getMessage());\n    }\n  }\n}',
      explanation: 'The try-with-resources statement ensures that each resource is closed at the end of the statement automatically.\n\nExpected Output:\nFile write complete, writer closed automatically.',
      syntax: ['try (ResourceType res = new ResourceType()) { ... }']
    };
  }
  if (/exception|error/.test(t)) {
    return {
      title: 'Java Exceptions (try-catch-finally)',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    try {\n      int[] myNumbers = {1, 2, 3};\n      System.out.println(myNumbers[10]);\n    } catch (Exception e) {\n      System.out.println("Exception handled safely: " + e.getMessage());\n    } finally {\n      System.out.println("The try-catch block is finished.");\n    }\n  }\n}',
      explanation: 'The try statement allows you to define a block of code to be tested for errors while it is being executed.\n\nExpected Output:\nException handled safely: Index 10 out of bounds for length 3\nThe try-catch block is finished.',
      syntax: ['try { ... } catch (Exception e) { ... } finally { ... }']
    };
  }
  if (/create files|write files/.test(t)) {
    return {
      title: 'Java Create and Write Files',
      language: 'java',
      code: 'import java.io.File;\nimport java.io.FileWriter;\n\npublic class Main {\n  public static void main(String[] args) {\n    try {\n      File myObj = new File("filename.txt");\n      myObj.createNewFile();\n      FileWriter myWriter = new FileWriter("filename.txt");\n      myWriter.write("Files in Java are easy!");\n      myWriter.close();\n      System.out.println("Successfully wrote to the file.");\n    } catch (Exception e) {\n      System.out.println("An error occurred: " + e.getMessage());\n    }\n  }\n}',
      explanation: 'To create a file in Java, use the createNewFile() method. To write to a file, use the FileWriter class.\n\nExpected Output:\nSuccessfully wrote to the file.',
      syntax: ['file.createNewFile();', 'new FileWriter(path);']
    };
  }
  if (/read files/.test(t)) {
    return {
      title: 'Java Read Files',
      language: 'java',
      code: 'import java.io.File;\nimport java.util.Scanner;\n\npublic class Main {\n  public static void main(String[] args) {\n    try {\n      File myObj = new File("filename.txt");\n      Scanner myReader = new Scanner(myObj);\n      while (myReader.hasNextLine()) {\n        String data = myReader.nextLine();\n        System.out.println("Read: " + data);\n      }\n      myReader.close();\n    } catch (Exception e) {\n      System.out.println("File reading error: " + e.getMessage());\n    }\n  }\n}',
      explanation: 'To read a file in Java, we can use the Scanner class initialized with a File object.\n\nExpected Output:\nRead: (file content string)',
      syntax: ['Scanner myReader = new Scanner(file);']
    };
  }
  if (/delete files|delete file/.test(t)) {
    return {
      title: 'Java Delete Files',
      language: 'java',
      code: 'import java.io.File;\n\npublic class Main {\n  public static void main(String[] args) {\n    File myObj = new File("filename.txt");\n    if (myObj.delete()) {\n      System.out.println("Deleted the file: " + myObj.getName());\n    } else {\n      System.out.println("Failed to delete the file.");\n    }\n  }\n}',
      explanation: 'To delete a file in Java, use the delete() method of the File class.\n\nExpected Output:\nDeleted the file: filename.txt',
      syntax: ['file.delete()']
    };
  }
  if (/file/.test(t)) {
    return {
      title: 'Java File Class',
      language: 'java',
      code: 'import java.io.File;\n\npublic class Main {\n  public static void main(String[] args) {\n    File myObj = new File("filename.txt");\n    System.out.println("File name: " + myObj.getName());\n    System.out.println("Absolute path: " + myObj.getAbsolutePath());\n    System.out.println("Writeable: " + myObj.canWrite());\n  }\n}',
      explanation: 'The File class from the java.io package allows us to inspect, query, and manipulate files and directories.\n\nExpected Output:\nFile name: filename.txt\nAbsolute path: (full path)\nWriteable: true',
      syntax: ['File file = new File("filename.txt");']
    };
  }
  if (/hashmap/.test(t)) {
    return {
      title: 'Java HashMap (Key-Value)',
      language: 'java',
      code: 'import java.util.HashMap;\n\npublic class Main {\n  public static void main(String[] args) {\n    HashMap<String, String> capitalCities = new HashMap<String, String>();\n    capitalCities.put("England", "London");\n    capitalCities.put("Germany", "Berlin");\n    capitalCities.put("USA", "Washington DC");\n    System.out.println("Capital of England: " + capitalCities.get("England"));\n    System.out.println("Size: " + capitalCities.size());\n  }\n}',
      explanation: 'A HashMap stores items in "key/value" pairs, and you can access them by an index of another type (like a String).\n\nExpected Output:\nCapital of England: London\nSize: 3',
      syntax: ['HashMap<K, V> map = new HashMap<>();', 'map.put(key, val);', 'map.get(key);']
    };
  }
  if (/arraylist/.test(t)) {
    return {
      title: 'Java ArrayList',
      language: 'java',
      code: 'import java.util.ArrayList;\n\npublic class Main {\n  public static void main(String[] args) {\n    ArrayList<String> cars = new ArrayList<String>();\n    cars.add("Volvo");\n    cars.add("BMW");\n    cars.add("Ford");\n    System.out.println("First car: " + cars.get(0));\n    System.out.println("Total cars: " + cars.size());\n  }\n}',
      explanation: 'The ArrayList class is a resizable array, which can be found in the java.util package.\n\nExpected Output:\nFirst car: Volvo\nTotal cars: 3',
      syntax: ['ArrayList<Type> list = new ArrayList<>();', 'list.add(val);', 'list.get(index);']
    };
  }
  if (/hashset/.test(t)) {
    return {
      title: 'Java HashSet',
      language: 'java',
      code: 'import java.util.HashSet;\n\npublic class Main {\n  public static void main(String[] args) {\n    HashSet<String> cars = new HashSet<String>();\n    cars.add("Volvo");\n    cars.add("BMW");\n    cars.add("Ford");\n    cars.add("BMW"); // Duplicate ignored\n    System.out.println("HashSet: " + cars);\n    System.out.println("Contains BMW? " + cars.contains("BMW"));\n  }\n}',
      explanation: 'A HashSet is a collection of items where every item is unique, and it is found in the java.util package.\n\nExpected Output:\nHashSet: [Volvo, BMW, Ford]\nContains BMW? true',
      syntax: ['HashSet<Type> set = new HashSet<>();', 'set.contains(val);']
    };
  }
  if (/iterator/.test(t)) {
    return {
      title: 'Java Iterator',
      language: 'java',
      code: 'import java.util.ArrayList;\nimport java.util.Iterator;\n\npublic class Main {\n  public static void main(String[] args) {\n    ArrayList<String> cars = new ArrayList<String>();\n    cars.add("Volvo");\n    cars.add("BMW");\n    cars.add("Ford");\n\n    Iterator<String> it = cars.iterator();\n    while (it.hasNext()) {\n      System.out.println(it.next());\n    }\n  }\n}',
      explanation: 'An Iterator is an object that can be used to loop through collections, like ArrayList and HashSet.\n\nExpected Output:\nVolvo\nBMW\nFord',
      syntax: ['Iterator<Type> it = collection.iterator();', 'it.hasNext()', 'it.next()']
    };
  }
  if (/class|object|oop/.test(t)) {
    return {
      title: 'Java Classes and Objects',
      language: 'java',
      code: 'public class Main {\n  int x = 5;\n  public static void main(String[] args) {\n    Main myObj1 = new Main();\n    Main myObj2 = new Main();\n    System.out.println("myObj1.x = " + myObj1.x);\n    System.out.println("myObj2.x = " + myObj2.x);\n  }\n}',
      explanation: 'Java is an object-oriented programming language. Everything in Java is associated with classes and objects.\n\nExpected Output:\nmyObj1.x = 5\nmyObj2.x = 5',
      syntax: ['ClassName myObj = new ClassName();']
    };
  }
  if (/debugging/.test(t)) {
    return {
      title: 'Java Debugging & Assertions',
      language: 'java',
      code: 'public class Main {\n  public static void main(String[] args) {\n    int age = 14;\n    assert age >= 18 : "Underage: Cannot access system";\n    System.out.println("Age verified: " + age);\n  }\n}',
      explanation: 'Java assertions allow developers to test assumptions in code during development and debugging.\n\nExpected Output:\nAge verified: 14',
      syntax: ['assert condition : "Error message";']
    };
  }
  if (/i\/o stream|streams/.test(t)) {
    return {
      title: 'Java I/O Streams Overview',
      language: 'java',
      code: 'import java.io.InputStream;\nimport java.io.OutputStream;\n\npublic class Main {\n  public static void main(String[] args) {\n    System.out.println("Java I/O Streams support byte-based (InputStream/OutputStream) and character-based (Reader/Writer) pipelines.");\n  }\n}',
      explanation: 'Java I/O is based on streams. An I/O Stream represents an input source or an output destination of bytes or characters.\n\nExpected Output:\nJava I/O Streams support byte-based (InputStream/OutputStream) and character-based (Reader/Writer) pipelines.',
      syntax: ['InputStream in;', 'OutputStream out;']
    };
  }
  if (/keywords/.test(t)) {
    return {
      title: 'Java Reserved Keywords',
      language: 'java',
      code: 'public class Main {\n  final static double PI = 3.14159;\n  transient int temporaryData = 100;\n  public static void main(String[] args) {\n    System.out.println("PI: " + PI + ", temp: " + temporaryData);\n  }\n}',
      explanation: 'Java has a set of keywords that are reserved words, and they cannot be used as names of variables, methods, or classes.\n\nExpected Output:\nPI: 3.14159, temp: 100',
      syntax: ['final', 'static', 'transient', 'volatile']
    };
  }
  if (/collections\b/.test(t)) {
    return {
      title: 'Java Collections Framework',
      language: 'java',
      code: 'import java.util.ArrayList;\nimport java.util.Collections;\n\npublic class Main {\n  public static void main(String[] args) {\n    ArrayList<Integer> nums = new ArrayList<>();\n    nums.add(50);\n    nums.add(10);\n    nums.add(30);\n    Collections.sort(nums);\n    System.out.println("Sorted collections: " + nums);\n  }\n}',
      explanation: 'The Java Collections Framework provides an architecture to store and manipulate a group of objects.\n\nExpected Output:\nSorted collections: [10, 30, 50]',
      syntax: ['Collections.sort(collection);']
    };
  }

  return {
    title: 'Java Program Output',
    language: 'java',
    code: 'public class Main {\n  public static void main(String[] args) {\n    int a = 15, b = 25;\n    System.out.println("Java execution sum: " + (a + b));\n  }\n}',
    explanation: 'Basic Java program demonstrating classes, arithmetic calculation, and formatted terminal printout.\n\nExpected Output:\nJava execution sum: 40',
    syntax: ['System.out.println(expression);']
  };
}
