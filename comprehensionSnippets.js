module.exports = [
    {
      id: 'snippet1',
      description: 'Off-by-one error in loop (sum of array)',
      code: `function sumArray(arr) {
    let total = 0;
    for (let i = 0; i < arr.length; i++) {
      total += arr[i];
    }
    return total;
  }
  module.exports = sumArray;`,
      tests: [
        { testExpression: 'sumArray([1,2,3,4]) === 10' },
        { testExpression: 'sumArray([5,5,5]) === 15' }
      ]
    },
  
    {
      id: 'snippet2',
      description: 'Wrong comparison operator (find max)',
      code: `function findMax(a, b) {
    if (a < b) {
      return a;
    } else {
      return b;
    }
  }
  module.exports = findMax;`,
      tests: [
        { testExpression: 'findMax(3,7) === 7' },
        { testExpression: 'findMax(10,2) === 10' }
      ]
    },
  
    {
      id: 'snippet3',
      description: 'Missing return in recursive factorial',
      code: `function factorial(n) {
    if (n <= 1) {
      1;
    }
    return n * factorial(n - 1);
  }
  module.exports = factorial;`,
      tests: [
        { testExpression: 'factorial(5) === 120' },
        { testExpression: 'factorial(3) === 6' }
      ]
    },
  
    {
      id: 'snippet4',
      description: 'Typo in property name (object key lookup)',
      code: `function getProp(obj, key) {
    // Should return obj[key]
    return obj.ky;
  }
  module.exports = getProp;`,
      tests: [
        { testExpression: 'getProp({foo: 42}, "foo") === 42' },
        { testExpression: 'getProp({bar: "baz"}, "bar") === "baz"' }
      ]
    },
  
    {
      id: 'snippet5',
      description: 'Incorrect string concatenation (greeting)',
      code: `function greet(name) {
    // Expected "Hello, <name>!"
    return 'Hello ' + name;
  }
  module.exports = greet;`,
      tests: [
        { testExpression: 'greet("Alice") === "Hello, Alice!"' },
        { testExpression: 'greet("Bob") === "Hello, Bob!"' }
      ]
    }
  ];
  