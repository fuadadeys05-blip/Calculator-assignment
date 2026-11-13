// ===== STATE =====
// Everything the calculator "remembers" lives in this one object.
const state = {
  currentValue: '0',        // number shown in the big display (stored as text)
  previousValue: '',        // first number of a calculation, e.g. 15 in "15 × 4"
  operator: null,           // '+', '−', '×' or '÷'
  shouldResetScreen: false  // true right after an operator or a result
};

// ===== DOM ELEMENTS =====
const currentOperandEl = document.getElementById('current-operand');
const previousOperandEl = document.getElementById('previous-operand');
const buttonsEl = document.getElementById('buttons');
const themeToggleEl = document.getElementById('theme-toggle');

const MAX_DIGITS = 16;

// ===== HELPERS =====
// Rounds away floating point noise, e.g. 0.1 + 0.2 shows 0.3 instead of 0.30000000000000004
function formatResult(number) {
  return String(parseFloat(number.toPrecision(12)));
}

// ===== CORE INPUT FUNCTIONS =====
function appendNumber(digit) {
  if (state.shouldResetScreen) {
    state.currentValue = '0';
    state.shouldResetScreen = false;
  }
  if (state.currentValue.replace(/[-.]/g, '').length >= MAX_DIGITS) return;
  state.currentValue = state.currentValue === '0' ? digit : state.currentValue + digit;
}

function appendDecimal() {
  if (state.shouldResetScreen) {
    state.currentValue = '0';
    state.shouldResetScreen = false;
  }
  if (state.currentValue.includes('.')) return;
  state.currentValue += '.';
}

function chooseOperator(operator) {
  // If a calculation is already waiting (e.g. "5 + 3" then "×"), finish it first
  if (state.operator !== null && !state.shouldResetScreen) {
    compute();
  }
  state.previousValue = state.currentValue;
  state.operator = operator;
  state.shouldResetScreen = true;
}

function compute() {
  if (state.operator === null || state.previousValue === '') return;

  const a = parseFloat(state.previousValue);
  const b = parseFloat(state.currentValue);
  let result;

  switch (state.operator) {
    case '+': result = a + b; break;
    case '−': result = a - b; break;
    case '×': result = a * b; break;
    case '^': result = Math.pow(a, b); break;  
    default: return;
  }

  state.currentValue = formatResult(result);
  state.previousValue = '';
  state.operator = null;
  state.shouldResetScreen = true;
}

function clearCalculator() {
  state.currentValue = '0';
  state.previousValue = '';
  state.operator = null;
  state.shouldResetScreen = false;
}

function deleteLast() {
  if (state.shouldResetScreen) return;
  state.currentValue = state.currentValue.slice(0, -1);
  if (state.currentValue === '' || state.currentValue === '-') {
    state.currentValue = '0';
  }
}
// ===== SCIENTIFIC OPERATIONS =====
// Works on the number currently in the display: %, √ and x²
function applyUnaryOperation(type) {
  const value = parseFloat(state.currentValue);
  let result;

  switch (type) {
    case 'percent': result = value / 100; break;
    case 'sqrt': result = Math.sqrt(value); break;
    case 'square': result = value * value; break;
    default: return;
  }

  state.currentValue = formatResult(result);
  state.shouldResetScreen = true;
}

// +/- : flips the sign of the number in the display
function toggleSign() {
  if (state.currentValue === '0') return;
  state.currentValue = state.currentValue.startsWith('-')
    ? state.currentValue.slice(1)
    : '-' + state.currentValue;
}
// ===== ACTION ROUTER =====
// Every button with data-action="..." ends up here.
function handleAction(action) {
  switch (action) {
    case 'clear': clearCalculator(); break;
    case 'delete': deleteLast(); break;
    case 'decimal': appendDecimal(); break;
    case 'equals': compute(); break;
    case 'percent':
    case 'sqrt':
    case 'square': applyUnaryOperation(action); break;
    case 'negate': toggleSign(); break;
  }
}

// One entry point for every input (mouse click or keyboard).
function handleInput(type, value) {
  if (type === 'number') appendNumber(value);
  else if (type === 'operator') chooseOperator(value);
  else if (type === 'action') handleAction(value);
  updateDisplay();
}

// ===== DISPLAY =====
function updateDisplay() {
  currentOperandEl.textContent = state.currentValue;
  currentOperandEl.classList.toggle('shrink', state.currentValue.length > 12);
  previousOperandEl.textContent = state.operator
    ? `${state.previousValue} ${state.operator}`
    : '';
}

// ===== THEME (DARK / LIGHT) =====
function applyTheme(theme) {
  document.body.classList.toggle('dark', theme === 'dark');
  themeToggleEl.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const newTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
  applyTheme(newTheme);
  try {
    localStorage.setItem('calculator-theme', newTheme);
  } catch (error) {
    // Storage can be blocked in private windows; the toggle still works
  }
}

function loadSavedTheme() {
  let savedTheme = 'light';
  try {
    savedTheme = localStorage.getItem('calculator-theme') || 'light';
  } catch (error) {
    // Ignore and keep light theme
  }
  applyTheme(savedTheme);
}

// ===== EVENT LISTENERS =====
buttonsEl.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  button.blur(); // so pressing Enter later does not "click" this button again

  const { number, operator, action } = button.dataset;
  if (number !== undefined) handleInput('number', number);
  else if (operator) handleInput('operator', operator);
  else if (action) handleInput('action', action);
});

themeToggleEl.addEventListener('click', () => {
  toggleTheme();
  themeToggleEl.blur();
});

// ===== KEYBOARD SUPPORT =====
document.addEventListener('keydown', (event) => {
  const { key } = event;

  if (/^[0-9]$/.test(key)) handleInput('number', key);
  else if (key === '.' || key === ',') handleInput('action', 'decimal');
  else if (key === '+') handleInput('operator', '+');
  else if (key === '-') handleInput('operator', '−');
  else if (key === '*' || key === 'x') handleInput('operator', '×');
  else if (key === '/') handleInput('operator', '÷');
  else if (key === '^') handleInput('operator', '^');
  else if (key === '%') handleInput('action', 'percent');
  else if (key === 'r' || key === 'R') handleInput('action', 'sqrt');
  else if (key === 's' || key === 'S') handleInput('action', 'square');
  else if (key === 'n' || key === 'N') handleInput('action', 'negate');
  else if (key === 'Enter' || key === '=') handleInput('action', 'equals');
  else if (key === 'Backspace') handleInput('action', 'delete');
  else if (key === 'Escape' || key === 'Delete') handleInput('action', 'clear');
  else return; // any other key: do nothing

  event.preventDefault();
});

// ===== START =====
loadSavedTheme();
updateDisplay();
