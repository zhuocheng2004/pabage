
const tokenizer = require('../tokenizer');
const TokenType = tokenizer.TokenType;
const tokenize = tokenizer.tokenize;

const parse = require('../parser').parse;
const run = require('./calc-runner').run;

const operators = [
	{
		enclose:	[ [ TokenType.LPAREN, TokenType.RPAREN ] ],
		unary:		[ TokenType.PLUS, TokenType.MINUS ],
	},
	{
		binary:		[ TokenType.HAT ],
	},
	{
		binary:		[ TokenType.STAR, TokenType.SLASH ],
	},
	{
		binary:		[ TokenType.PLUS, TokenType.MINUS ],
	}
];

function evaluate(source) {
	const tokenzieResult = tokenize(source);
	
	if (tokenzieResult.err) {
		console.log(`Failed to tokenize: ${tokenzieResult.err} @ Line ${tokenzieResult.line}, Col ${tokenzieResult.col}`);
		return;
	}

	const tokens = tokenzieResult.tokens;

	//console.log(tokens);
	
	const parseResult = parse(tokens, operators);

	if (parseResult.err) {
		const tokenPos = parseResult.pos;
		const token = tokens[tokenPos];
		console.log(`Failed to parse: ${parseResult.err} @ Line ${token.line}, Col ${token.col}`);
		return;
	}

	const ast = parseResult.ast;

	//console.log(JSON.stringify(ast, undefined, 4));

	return run(ast);
}

if (process.argv.length >= 3) {
	console.log(evaluate(process.argv[2]))
}

module.exports = {
	evaluate:	evaluate,
};
