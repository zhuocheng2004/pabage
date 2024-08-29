
const tokenizer = require('../tokenizer');
const TokenType = tokenizer.TokenType;
const tokenize = tokenizer.tokenize;

const parse = require('../parser').parse;
const run = require('./calc-runner').run;

const operators = [
	{
		enclose:	[ [ TokenType.LPAREN, TokenType.RPAREN ], [ TokenType.LBRACKET, TokenType.RBRACKET ], [ TokenType.LBRACE, TokenType.RBRACE ] ],
		unary:		[ TokenType.PLUS, TokenType.MINUS ],
		binary:		[ TokenType.ATTACH, TokenType.DOT ],
	},
	{
		binary:		[ TokenType.HAT ],
	},
	{
		binary:		[ TokenType.STAR, TokenType.SLASH ],
	},
	{
		binary:		[ TokenType.PLUS, TokenType.MINUS ],
	},
	{
		binary:		[ TokenType.ASSISN ],
	}
];

function printContext(source, lineStart, col) {
	let s = '';
	for (let i = 0; i < col; i++) {
		const ch = source[lineStart + i];
		if (ch === '\t' || ch === '\r' || ch === '\n' || ch === '\b') {
			s += ch;
		} else {
			s += ' ';
		}
	}
	s += '^';

	const newLinePos = source.indexOf('\n', lineStart);
	console.log(source.substring(lineStart, newLinePos >= 0 ? newLinePos : source.length));
	console.log(s);
}

function printAST(ast) {
	console.log(JSON.stringify(ast, (key, value) => key === 'parent' ? '[parent]' : value, 4));
}

function evaluate(source) {
	const tokenzieResult = tokenize(source);
	
	if (tokenzieResult.err) {
		console.log(`Failed to tokenize: ${tokenzieResult.err} @ Line ${tokenzieResult.line}, Col ${tokenzieResult.col}`);
		printContext(source, tokenzieResult.lineStarts[tokenzieResult.line], tokenzieResult.col);
		return;
	}

	const tokens = tokenzieResult.tokens;

	//console.log(tokens);
	
	const parseResult = parse(tokens, operators);

	if (parseResult.err) {
		const tokenPos = parseResult.pos;
		const token = tokens[tokenPos];
		console.log(`Failed to parse: ${parseResult.err} @ Line ${token.line}, Col ${token.col}`);
		printContext(source, tokenzieResult.lineStarts[token.line], token.col);
		return;
	}

	const ast = parseResult.ast;

	//printAST(ast);

	return run(ast);
}

if (process.argv.length >= 3) {
	console.log(evaluate(process.argv[2]))
}

module.exports = {
	evaluate:	evaluate,
};
