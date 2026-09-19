import type { ExampleSnippet } from './types.js';

export function getSqlExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  if (/distinct/.test(t)) {
    return {
      title: 'SQL SELECT DISTINCT Statement',
      language: 'sql',
      code: 'SELECT DISTINCT Country FROM Customers\nORDER BY Country;',
      explanation: 'The SELECT DISTINCT statement is used to return only distinct (different) values from a column.\n\nExpected Output:\nCountry\n-------\nArgentina\nAustria\nBelgium\nBrazil\nCanada',
      syntax: ['SELECT DISTINCT column1, column2 FROM table_name;']
    };
  }
  if (/select top|limit/.test(t)) {
    return {
      title: 'SQL SELECT TOP / LIMIT',
      language: 'sql',
      code: 'SELECT TOP 3 CustomerName, Country FROM Customers\nWHERE Country = \'Germany\';\n-- Or in MySQL / PostgreSQL:\n-- SELECT CustomerName, Country FROM Customers WHERE Country = \'Germany\' LIMIT 3;',
      explanation: 'The SELECT TOP clause is used to specify the number of records to return from the result set.\n\nExpected Output:\nCustomerName             | Country\n-------------------------+--------\nAlfreds Futterkiste      | Germany\nBlauer See Delikatessen  | Germany\nDrachenblut Delikatessen | Germany',
      syntax: ['SELECT TOP number column_name FROM table;', 'SELECT column FROM table LIMIT number;']
    };
  }
  if (/where/.test(t)) {
    return {
      title: 'SQL WHERE Clause',
      language: 'sql',
      code: 'SELECT * FROM Customers\nWHERE Country = \'Mexico\';',
      explanation: 'The WHERE clause is used to filter records that fulfill a specified condition.\n\nExpected Output:\nCustomerID | CustomerName                 | City        | Country\n2          | Ana Trujillo Emparedados y helados | México D.F. | Mexico\n3          | Antonio Moreno Taquería      | México D.F. | Mexico',
      syntax: ['SELECT column1, column2 FROM table_name WHERE condition;']
    };
  }
  if (/order by/.test(t)) {
    return {
      title: 'SQL ORDER BY Keyword',
      language: 'sql',
      code: 'SELECT ProductName, Price FROM Products\nORDER BY Price DESC;',
      explanation: 'The ORDER BY keyword is used to sort the result-set in ascending (ASC) or descending (DESC) order.\n\nExpected Output:\nProductName             | Price\n------------------------+------\nCôte de Blaye           | 263.50\nThüringer Rostbratwurst | 123.79\nMishi Kobe Niku         | 97.00',
      syntax: ['SELECT columns FROM table ORDER BY column [ASC|DESC];']
    };
  }
  if (/arithmetic operator/.test(t)) {
    return {
      title: 'SQL Arithmetic Operators (+, -, *, /, %)',
      language: 'sql',
      code: 'SELECT 30 + 20 AS Addition, 30 - 20 AS Subtraction, 30 * 2 AS Multiplication, 30 / 2 AS Division, 30 % 4 AS Modulo;',
      explanation: 'Arithmetic operators perform mathematical operations on two expressions of one or more data types.\n\nExpected Output:\nAddition | Subtraction | Multiplication | Division | Modulo\n---------+-------------+----------------+----------+-------\n50       | 10          | 60             | 15       | 2',
      syntax: ['SELECT val1 + val2 AS Result;']
    };
  }
  if (/bitwise operator/.test(t)) {
    return {
      title: 'SQL Bitwise Operators (&, |, ^)',
      language: 'sql',
      code: 'SELECT 29 & 15 AS BitwiseAND, 29 | 15 AS BitwiseOR, 29 ^ 15 AS BitwiseXOR;',
      explanation: 'Bitwise operators perform bit manipulations between two integer expressions.\n\nExpected Output:\nBitwiseAND | BitwiseOR | BitwiseXOR\n-----------+-----------+-----------\n13         | 31        | 18',
      syntax: ['SELECT val1 & val2 AS BitwiseAND;']
    };
  }
  if (/comparison operator/.test(t)) {
    return {
      title: 'SQL Comparison Operators (=, >, <, >=, <=, <>)',
      language: 'sql',
      code: 'SELECT ProductID, ProductName, Price\nFROM Products\nWHERE Price >= 20 AND Price <= 50;',
      explanation: 'Comparison operators test whether two expressions are the same, greater, or less than each other.\n\nExpected Output:\nProductID | ProductName     | Price\n----------+-----------------+------\n1         | Chai            | 21.00\n2         | Chang           | 22.00',
      syntax: ['WHERE column >= value;']
    };
  }
  if (/\b(and|or|not)\b/.test(t) && !/null/.test(t)) {
    return {
      title: 'SQL AND, OR, and NOT Operators',
      language: 'sql',
      code: 'SELECT * FROM Customers\nWHERE Country = \'Germany\' AND (City = \'Berlin\' OR City = \'Stuttgart\');',
      explanation: 'The WHERE clause can be combined with AND, OR, and NOT operators to filter records on multiple criteria.\n\nExpected Output:\nCustomerID | CustomerName        | City      | Country\n1          | Alfreds Futterkiste | Berlin    | Germany\n25         | Frankenversand      | Stuttgart | Germany',
      syntax: ['WHERE condition1 AND (condition2 OR condition3);']
    };
  }
  if (/insert into select/.test(t)) {
    return {
      title: 'SQL INSERT INTO SELECT Statement',
      language: 'sql',
      code: 'INSERT INTO Customers (CustomerName, City, Country)\nSELECT SupplierName, City, Country FROM Suppliers\nWHERE Country = \'Germany\';',
      explanation: 'The INSERT INTO SELECT statement copies data from one table and inserts it into another existing table.\n\nExpected Output:\nQuery OK, 3 rows affected (0.01 sec)',
      syntax: ['INSERT INTO table2 (columns) SELECT columns FROM table1 WHERE condition;']
    };
  }
  if (/insert into|insert/.test(t)) {
    return {
      title: 'SQL INSERT INTO Statement',
      language: 'sql',
      code: 'INSERT INTO Customers (CustomerName, ContactName, Address, City, PostalCode, Country)\nVALUES (\'Cardinal\', \'Tom B. Erichsen\', \'Skagen 21\', \'Stavanger\', \'4006\', \'Norway\');',
      explanation: 'The INSERT INTO statement is used to insert new records in a table.\n\nExpected Output:\nQuery OK, 1 row affected (0.01 sec)',
      syntax: ['INSERT INTO table_name (column1, column2) VALUES (value1, value2);']
    };
  }
  if (/null value|null/.test(t)) {
    return {
      title: 'SQL NULL Values (IS NULL / IS NOT NULL)',
      language: 'sql',
      code: 'SELECT CustomerName, ContactName, Address\nFROM Customers\nWHERE Address IS NULL;',
      explanation: 'A field with a NULL value is a field with no value. Use IS NULL and IS NOT NULL operators.\n\nExpected Output:\n(0 rows returned if all customers have addresses present)',
      syntax: ['SELECT columns FROM table WHERE column IS NULL;']
    };
  }
  if (/update/.test(t)) {
    return {
      title: 'SQL UPDATE Statement',
      language: 'sql',
      code: 'UPDATE Customers\nSET ContactName = \'Alfred Schmidt\', City = \'Frankfurt\'\nWHERE CustomerID = 1;',
      explanation: 'The UPDATE statement is used to modify the existing records in a table. Be sure to provide a WHERE clause!\n\nExpected Output:\nQuery OK, 1 row affected (0.01 sec)',
      syntax: ['UPDATE table_name SET column1 = value1 WHERE condition;']
    };
  }
  if (/delete/.test(t)) {
    return {
      title: 'SQL DELETE Statement',
      language: 'sql',
      code: 'DELETE FROM Customers\nWHERE CustomerName = \'Alfreds Futterkiste\';',
      explanation: 'The DELETE statement is used to delete existing records in a table.\n\nExpected Output:\nQuery OK, 1 row affected (0.01 sec)',
      syntax: ['DELETE FROM table_name WHERE condition;']
    };
  }
  if (/min|max/.test(t)) {
    return {
      title: 'SQL MIN() and MAX() Functions',
      language: 'sql',
      code: 'SELECT MIN(Price) AS SmallestPrice, MAX(Price) AS LargestPrice\nFROM Products;',
      explanation: 'MIN() returns the smallest value of the selected column. MAX() returns the largest value.\n\nExpected Output:\nSmallestPrice | LargestPrice\n--------------+-------------\n2.50          | 263.50',
      syntax: ['SELECT MIN(col) FROM table;', 'SELECT MAX(col) FROM table;']
    };
  }
  if (/count|sum|avg|aggregate/.test(t)) {
    return {
      title: 'SQL COUNT(), AVG(), and SUM() Functions',
      language: 'sql',
      code: 'SELECT COUNT(ProductID) AS TotalProducts,\n       AVG(Price) AS AveragePrice,\n       SUM(Price) AS TotalPriceSum\nFROM Products;',
      explanation: 'COUNT() returns the number of rows. AVG() calculates the average. SUM() returns the sum of numeric values.\n\nExpected Output:\nTotalProducts | AveragePrice | TotalPriceSum\n--------------+--------------+--------------\n77            | 28.8663      | 2222.71',
      syntax: ['SELECT COUNT(col), AVG(col), SUM(col) FROM table;']
    };
  }
  if (/like|wildcard/.test(t)) {
    return {
      title: 'SQL LIKE Operator & Wildcards',
      language: 'sql',
      code: 'SELECT * FROM Customers\nWHERE CustomerName LIKE \'a%\'; -- Starts with "a"',
      explanation: 'The LIKE operator searches for a specified pattern in a column (% represents zero, one, or multiple characters; _ represents one character).\n\nExpected Output:\nCustomerID | CustomerName        | City   | Country\n1          | Alfreds Futterkiste | Berlin | Germany\n2          | Ana Trujillo...     | Mexico | Mexico',
      syntax: ['SELECT columns FROM table WHERE column LIKE pattern;']
    };
  }
  if (/in operator|\bin\b/.test(t)) {
    return {
      title: 'SQL IN Operator',
      language: 'sql',
      code: 'SELECT * FROM Customers\nWHERE Country IN (\'Germany\', \'France\', \'UK\');',
      explanation: 'The IN operator allows you to specify multiple values in a WHERE clause (a shorthand for multiple OR conditions).\n\nExpected Output:\nCustomerID | CustomerName        | City   | Country\n1          | Alfreds Futterkiste | Berlin | Germany\n4          | Around the Horn     | London | UK',
      syntax: ['SELECT columns FROM table WHERE column IN (val1, val2, ...);']
    };
  }
  if (/between/.test(t)) {
    return {
      title: 'SQL BETWEEN Operator',
      language: 'sql',
      code: 'SELECT * FROM Products\nWHERE Price BETWEEN 10 AND 20;',
      explanation: 'The BETWEEN operator selects values within a given range (numbers, text, or dates; inclusive of endpoints).\n\nExpected Output:\nProductID | ProductName   | Price\n----------+---------------+------\n1         | Chai          | 18.00\n2         | Chang         | 19.00\n3         | Aniseed Syrup | 10.00',
      syntax: ['SELECT columns FROM table WHERE column BETWEEN val1 AND val2;']
    };
  }
  if (/alias/.test(t)) {
    return {
      title: 'SQL Aliases (AS Keyword)',
      language: 'sql',
      code: 'SELECT CustomerID AS ID, CustomerName AS Customer\nFROM Customers;',
      explanation: 'SQL aliases are used to give a table, or a column in a table, a temporary name to improve query readability.\n\nExpected Output:\nID | Customer\n---+--------------------\n1  | Alfreds Futterkiste\n2  | Ana Trujillo...',
      syntax: ['SELECT column_name AS alias_name FROM table_name;']
    };
  }
  if (/left join/.test(t)) {
    return {
      title: 'SQL LEFT JOIN',
      language: 'sql',
      code: 'SELECT Customers.CustomerName, Orders.OrderID\nFROM Customers\nLEFT JOIN Orders ON Customers.CustomerID = Orders.CustomerID\nORDER BY Customers.CustomerName;',
      explanation: 'The LEFT JOIN keyword returns all records from the left table, and the matching records from the right table.\n\nExpected Output:\nCustomerName        | OrderID\n--------------------+--------\nAlfreds Futterkiste | 10643\nAna Trujillo...     | 10308\nAntonio Moreno...   | NULL',
      syntax: ['SELECT columns FROM table1 LEFT JOIN table2 ON table1.col = table2.col;']
    };
  }
  if (/right join/.test(t)) {
    return {
      title: 'SQL RIGHT JOIN',
      language: 'sql',
      code: 'SELECT Orders.OrderID, Employees.LastName, Employees.FirstName\nFROM Orders\nRIGHT JOIN Employees ON Orders.EmployeeID = Employees.EmployeeID\nORDER BY Orders.OrderID;',
      explanation: 'The RIGHT JOIN keyword returns all records from the right table, and matching records from the left table.\n\nExpected Output:\nOrderID | LastName  | FirstName\n--------+-----------+----------\n10248   | Buchanan  | Steven\n10249   | Suyama    | Michael',
      syntax: ['SELECT columns FROM table1 RIGHT JOIN table2 ON table1.col = table2.col;']
    };
  }
  if (/full join|full outer join/.test(t)) {
    return {
      title: 'SQL FULL OUTER JOIN',
      language: 'sql',
      code: 'SELECT Customers.CustomerName, Orders.OrderID\nFROM Customers\nFULL OUTER JOIN Orders ON Customers.CustomerID = Orders.CustomerID\nORDER BY Customers.CustomerName;',
      explanation: 'The FULL OUTER JOIN returns all records when there is a match in either left table or right table.\n\nExpected Output:\nCustomerName   | OrderID\n---------------+--------\nAlfreds...     | 10643\nNULL           | 10999',
      syntax: ['SELECT columns FROM table1 FULL OUTER JOIN table2 ON condition;']
    };
  }
  if (/self join/.test(t)) {
    return {
      title: 'SQL SELF JOIN',
      language: 'sql',
      code: 'SELECT A.CustomerName AS CustomerName1, B.CustomerName AS CustomerName2, A.City\nFROM Customers A, Customers B\nWHERE A.CustomerID <> B.CustomerID AND A.City = B.City\nORDER BY A.City;',
      explanation: 'A self join is a regular join, but the table is joined with itself using table aliases.\n\nExpected Output:\nCustomerName1 | CustomerName2 | City\n--------------+---------------+---------\nBólido Comidas| Océano        | Madrid',
      syntax: ['SELECT columns FROM table1 A, table1 B WHERE condition;']
    };
  }
  if (/union all/.test(t)) {
    return {
      title: 'SQL UNION ALL Operator',
      language: 'sql',
      code: 'SELECT City, Country FROM Customers WHERE Country=\'Germany\'\nUNION ALL\nSELECT City, Country FROM Suppliers WHERE Country=\'Germany\';',
      explanation: 'The UNION ALL operator selects all values including duplicates from two or more SELECT statements.\n\nExpected Output:\nCity      | Country\n----------+--------\nBerlin    | Germany\nStuttgart | Germany\nBerlin    | Germany',
      syntax: ['SELECT col FROM t1 UNION ALL SELECT col FROM t2;']
    };
  }
  if (/union/.test(t)) {
    return {
      title: 'SQL UNION Operator',
      language: 'sql',
      code: 'SELECT City FROM Customers\nUNION\nSELECT City FROM Suppliers\nORDER BY City;',
      explanation: 'The UNION operator is used to combine the result-set of two or more SELECT statements (selects only distinct values).\n\nExpected Output:\nCity\n----\nAachen\nAlbuquerque\nAnchorage\nBarcelona',
      syntax: ['SELECT column_name(s) FROM table1 UNION SELECT column_name(s) FROM table2;']
    };
  }
  if (/inner join|join/.test(t)) {
    return {
      title: 'SQL INNER JOIN',
      language: 'sql',
      code: 'SELECT Orders.OrderID, Customers.CustomerName, Orders.OrderDate\nFROM Orders\nINNER JOIN Customers ON Orders.CustomerID = Customers.CustomerID;',
      explanation: 'The INNER JOIN keyword selects records that have matching values in both tables.\n\nExpected Output:\nOrderID | CustomerName   | OrderDate\n--------+----------------+----------\n10248   | Vins et alcools| 1996-07-04\n10249   | Toms Spezial   | 1996-07-05',
      syntax: ['SELECT columns FROM table1 INNER JOIN table2 ON table1.col = table2.col;']
    };
  }
  if (/group by/.test(t)) {
    return {
      title: 'SQL GROUP BY Statement',
      language: 'sql',
      code: 'SELECT COUNT(CustomerID) AS NumberOfCustomers, Country\nFROM Customers\nGROUP BY Country\nORDER BY COUNT(CustomerID) DESC;',
      explanation: 'The GROUP BY statement groups rows that have the same values into summary rows, typically used with aggregate functions.\n\nExpected Output:\nNumberOfCustomers | Country\n------------------+--------\n13                | USA\n11                | Germany\n11                | France',
      syntax: ['SELECT COUNT(col), col FROM table GROUP BY col;']
    };
  }
  if (/having/.test(t)) {
    return {
      title: 'SQL HAVING Clause',
      language: 'sql',
      code: 'SELECT COUNT(CustomerID) AS CustomerCount, Country\nFROM Customers\nGROUP BY Country\nHAVING COUNT(CustomerID) > 5\nORDER BY COUNT(CustomerID) DESC;',
      explanation: 'The HAVING clause was added to SQL because the WHERE keyword cannot be used with aggregate functions.\n\nExpected Output:\nCustomerCount | Country\n--------------+--------\n13            | USA\n11            | Germany\n11            | France',
      syntax: ['SELECT column, COUNT(*) FROM table GROUP BY column HAVING condition;']
    };
  }
  if (/exists/.test(t)) {
    return {
      title: 'SQL EXISTS Operator',
      language: 'sql',
      code: 'SELECT SupplierName\nFROM Suppliers\nWHERE EXISTS (\n    SELECT ProductName FROM Products\n    WHERE Products.SupplierID = Suppliers.supplierID AND Price < 20\n);',
      explanation: 'The EXISTS operator is used to test for the existence of any record in a subquery (returns TRUE if records exist).\n\nExpected Output:\nSupplierName\n------------------------\nExotic Liquids\nNew Orleans Cajun Delights',
      syntax: ['SELECT columns FROM table WHERE EXISTS (subquery);']
    };
  }
  if (/any|all/.test(t)) {
    return {
      title: 'SQL ANY and ALL Operators',
      language: 'sql',
      code: 'SELECT ProductName\nFROM Products\nWHERE ProductID = ANY (\n  SELECT ProductID\n  FROM OrderDetails\n  WHERE Quantity = 10\n);',
      explanation: 'The ANY and ALL operators allow you to perform a comparison between a single column value and a range of other values.\n\nExpected Output:\nProductName\n-------------------\nChai\nChang\nAniseed Syrup',
      syntax: ['WHERE column_name operator ANY (subquery)']
    };
  }
  if (/case/.test(t)) {
    return {
      title: 'SQL CASE Statement',
      language: 'sql',
      code: 'SELECT OrderID, Quantity,\nCASE\n    WHEN Quantity > 30 THEN \'The quantity is greater than 30\'\n    WHEN Quantity = 30 THEN \'The quantity is 30\'\n    ELSE \'The quantity is under 30\'\nEND AS QuantityText\nFROM OrderDetails;',
      explanation: 'The CASE statement goes through conditions and returns a value when the first condition is met.\n\nExpected Output:\nOrderID | Quantity | QuantityText\n--------+----------+-----------------------------\n10248   | 12       | The quantity is under 30\n10248   | 40       | The quantity is greater than 30',
      syntax: ['CASE WHEN condition THEN result ELSE fallback END']
    };
  }
  if (/null function|ifnull|coalesce/.test(t)) {
    return {
      title: 'SQL NULL Functions (IFNULL / COALESCE)',
      language: 'sql',
      code: 'SELECT ProductName, UnitPrice * (UnitsInStock + IFNULL(UnitsOnOrder, 0)) AS TotalValue\nFROM Products;',
      explanation: 'SQL IFNULL() or COALESCE() lets you return an alternative value if an expression is NULL.\n\nExpected Output:\nProductName | TotalValue\n------------+-----------\nChai        | 702.00\nChang       | 323.00',
      syntax: ['IFNULL(column, fallbackValue)', 'COALESCE(val1, val2, fallback)']
    };
  }
  if (/select into/.test(t)) {
    return {
      title: 'SQL SELECT INTO Statement',
      language: 'sql',
      code: 'SELECT * INTO CustomersBackup2026\nFROM Customers\nWHERE Country = \'Germany\';',
      explanation: 'The SELECT INTO statement copies data from one table into a new table.\n\nExpected Output:\nQuery OK, 11 rows affected (0.02 sec)',
      syntax: ['SELECT * INTO new_table FROM old_table WHERE condition;']
    };
  }
  if (/create database|drop database/.test(t)) {
    return {
      title: 'SQL CREATE & DROP DATABASE',
      language: 'sql',
      code: '-- Create a new database:\nCREATE DATABASE testDB;\n\n-- Drop a database:\nDROP DATABASE testDB;',
      explanation: 'The CREATE DATABASE statement is used to create a new SQL database. DROP DATABASE deletes it.\n\nExpected Output:\nQuery OK, 1 row affected (0.01 sec)',
      syntax: ['CREATE DATABASE dbname;', 'DROP DATABASE dbname;']
    };
  }
  if (/create table/.test(t)) {
    return {
      title: 'SQL CREATE TABLE Statement',
      language: 'sql',
      code: 'CREATE TABLE Persons (\n    PersonID int NOT NULL PRIMARY KEY,\n    LastName varchar(255) NOT NULL,\n    FirstName varchar(255),\n    Address varchar(255),\n    City varchar(255)\n);',
      explanation: 'The CREATE TABLE statement is used to create a new table in a database with specified column names and datatypes.\n\nExpected Output:\nQuery OK, 0 rows affected (0.02 sec)',
      syntax: ['CREATE TABLE table_name (column1 datatype, column2 datatype, ...);']
    };
  }
  if (/alter table/.test(t)) {
    return {
      title: 'SQL ALTER TABLE Statement',
      language: 'sql',
      code: 'ALTER TABLE Customers\nADD Email varchar(255);',
      explanation: 'The ALTER TABLE statement is used to add, delete, or modify columns in an existing table.\n\nExpected Output:\nQuery OK, 0 rows affected (0.02 sec)',
      syntax: ['ALTER TABLE table_name ADD column_name datatype;']
    };
  }
  if (/drop table|truncate/.test(t)) {
    return {
      title: 'SQL DROP TABLE and TRUNCATE',
      language: 'sql',
      code: '-- Delete the table definition and all records:\nDROP TABLE Shippers;\n\n-- Or delete all records without deleting the table structure:\nTRUNCATE TABLE Categories;',
      explanation: 'DROP TABLE removes the entire table from the database. TRUNCATE TABLE deletes data inside a table but keeps the structure.\n\nExpected Output:\nQuery OK, 0 rows affected (0.01 sec)',
      syntax: ['DROP TABLE table_name;', 'TRUNCATE TABLE table_name;']
    };
  }
  if (/primary key|foreign key|unique|check|constraint|not null/.test(t)) {
    return {
      title: 'SQL Constraints (PRIMARY KEY, FOREIGN KEY, CHECK)',
      language: 'sql',
      code: 'CREATE TABLE Orders (\n    OrderID int NOT NULL PRIMARY KEY,\n    OrderNumber int NOT NULL UNIQUE,\n    PersonID int FOREIGN KEY REFERENCES Persons(PersonID),\n    OrderAmount decimal(10, 2) CHECK (OrderAmount > 0)\n);',
      explanation: 'SQL constraints specify rules for the data in a table to ensure accuracy and reliability.\n\nExpected Output:\nQuery OK, 0 rows affected (0.02 sec)',
      syntax: ['column_name datatype CONSTRAINT_TYPE']
    };
  }
  if (/index/.test(t)) {
    return {
      title: 'SQL CREATE INDEX Statement',
      language: 'sql',
      code: 'CREATE INDEX idx_lastname\nON Persons (LastName);',
      explanation: 'The CREATE INDEX statement is used to create indexes in tables to retrieve data from the database more quickly.\n\nExpected Output:\nQuery OK, 0 rows affected (0.02 sec)',
      syntax: ['CREATE INDEX index_name ON table_name (column1, column2);']
    };
  }
  if (/auto increment/.test(t)) {
    return {
      title: 'SQL AUTO INCREMENT Field',
      language: 'sql',
      code: 'CREATE TABLE Persons (\n    PersonID int NOT NULL AUTO_INCREMENT PRIMARY KEY,\n    LastName varchar(255) NOT NULL,\n    FirstName varchar(255)\n);',
      explanation: 'Auto-increment allows a unique number to be generated automatically when a new record is inserted into a table.\n\nExpected Output:\nQuery OK, 0 rows affected (0.02 sec)',
      syntax: ['col INT AUTO_INCREMENT PRIMARY KEY']
    };
  }
  if (/date/.test(t)) {
    return {
      title: 'SQL Working With Dates',
      language: 'sql',
      code: 'SELECT OrderID, OrderDate FROM Orders\nWHERE OrderDate = \'1996-07-04\';',
      explanation: 'The most difficult part when working with dates is to be sure that the format of the date you are trying to insert matches the format of the date column in the database (YYYY-MM-DD).\n\nExpected Output:\nOrderID | OrderDate\n--------+----------\n10248   | 1996-07-04',
      syntax: ['WHERE OrderDate = \'YYYY-MM-DD\';']
    };
  }
  if (/view/.test(t)) {
    return {
      title: 'SQL CREATE VIEW Statement',
      language: 'sql',
      code: 'CREATE VIEW [Brazil Customers] AS\nSELECT CustomerName, ContactName\nFROM Customers\nWHERE Country = \'Brazil\';\n\n-- Query the view:\nSELECT * FROM [Brazil Customers];',
      explanation: 'In SQL, a view is a virtual table based on the result-set of an SQL statement.\n\nExpected Output:\nCustomerName            | ContactName\n------------------------+-------------------\nComércio Mineiro        | Pedro Afonso\nFamilia Arquibaldo      | Aria Cruz',
      syntax: ['CREATE VIEW view_name AS SELECT ...;']
    };
  }
  if (/stored procedure|procedure/.test(t)) {
    return {
      title: 'SQL Stored Procedures',
      language: 'sql',
      code: 'CREATE PROCEDURE SelectAllCustomers @City nvarchar(30)\nAS\nSELECT * FROM Customers WHERE City = @City\nGO;\n\n-- Execution:\nEXEC SelectAllCustomers @City = \'London\';',
      explanation: 'A stored procedure is a prepared SQL code that you can save, so the code can be reused over and over again.\n\nExpected Output:\nCustomerID | CustomerName    | City   | Country\n4          | Around the Horn | London | UK\n11         | B\'s Beverages   | London | UK',
      syntax: ['CREATE PROCEDURE name AS ... GO;', 'EXEC name;']
    };
  }
  if (/default/.test(t)) {
    return {
      title: 'SQL DEFAULT Constraint',
      language: 'sql',
      code: 'CREATE TABLE Persons (\n  ID int NOT NULL,\n  LastName varchar(255) NOT NULL,\n  FirstName varchar(255),\n  City varchar(255) DEFAULT \'Sandnes\'\n);',
      explanation: 'The DEFAULT constraint is used to set a default value for a column when no value is specified.\n\nExpected Output:\nQuery OK, 0 rows affected (0.02 sec)',
      syntax: ['column_name datatype DEFAULT default_value']
    };
  }
  if (/comment/.test(t)) {
    return {
      title: 'SQL Comments (-- and /* */)',
      language: 'sql',
      code: '-- Select all customers from Germany:\nSELECT * FROM Customers WHERE Country = \'Germany\';\n\n/* Select all customers\n   with postal codes */\nSELECT CustomerName, PostalCode FROM Customers;',
      explanation: 'Comments are used to explain sections of SQL statements, or to prevent execution of SQL statements.\n\nExpected Output:\nCustomerID | CustomerName        | Country\n1          | Alfreds Futterkiste | Germany',
      syntax: ['-- Single-line comment', '/* Multi-line comment */']
    };
  }
  if (/regular expression|regexp/.test(t)) {
    return {
      title: 'SQL Regular Expressions (REGEXP)',
      language: 'sql',
      code: 'SELECT * FROM Customers\nWHERE City REGEXP \'^[A-G]\';',
      explanation: 'A regular expression (REGEXP) is a sequence of characters that specifies a search pattern in SQL.\n\nExpected Output:\nCustomerID | CustomerName        | City    | Country\n1          | Alfreds Futterkiste | Berlin  | Germany\n4          | Around the Horn     | Bern    | Switzerland',
      syntax: ['WHERE column REGEXP pattern']
    };
  }
  if (/function/.test(t)) {
    return {
      title: 'SQL Functions (String & Math)',
      language: 'sql',
      code: 'SELECT UPPER(CustomerName) AS UppercaseName, ROUND(Price, 1) AS RoundedPrice\nFROM Products\nJOIN Customers ON Products.SupplierID = Customers.CustomerID;',
      explanation: 'SQL has many built-in functions for performing calculations on data: string, numeric, date, and advanced functions.\n\nExpected Output:\nUppercaseName       | RoundedPrice\n--------------------+-------------\nCHAI                | 18.0\nCHANG               | 19.0',
      syntax: ['SELECT UPPER(column) FROM table;', 'SELECT ROUND(column, decimals) FROM table;']
    };
  }
  if (/data type/.test(t)) {
    return {
      title: 'SQL Data Types',
      language: 'sql',
      code: 'CREATE TABLE SampleTable (\n  Id INT,\n  Name VARCHAR(100),\n  Price DECIMAL(10, 2),\n  CreatedAt DATETIME,\n  IsActive BOOLEAN\n);',
      explanation: 'Each column in a database table is required to have a name and a data type (e.g. string, numeric, date and time).\n\nExpected Output:\nQuery OK, 0 rows affected (0.02 sec)',
      syntax: ['col_name VARCHAR(255)', 'col_name INT', 'col_name DATETIME']
    };
  }

  return {
    title: 'SQL SELECT Statement',
    language: 'sql',
    code: 'SELECT CustomerName, City, Country\nFROM Customers\nWHERE Country = \'Germany\';',
    explanation: 'The SELECT statement is used to select data from a database. The data returned is stored in a result table.\n\nExpected Output:\nCustomerName        | City      | Country\n--------------------+-----------+--------\nAlfreds Futterkiste | Berlin    | Germany\nFrankenversand      | Stuttgart | Germany',
    syntax: ['SELECT column1, column2 FROM table_name WHERE condition;']
  };
}
