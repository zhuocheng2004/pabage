
const tokenizer = require('./tokenizer');
const TokenType = tokenizer.TokenType;
const tokenize = tokenizer.tokenize;

const parse = require('./parser').parse;

const transform = require('./transormer').transform;

const runner_core = require('./runner-core');
const ObjectType = runner_core.ObjectType, run = runner_core.run;

const operators = [
	{
		enclose:	[ [ TokenType.LPAREN, TokenType.RPAREN ], [ TokenType.LBRACKET, TokenType.RBRACKET ], [ TokenType.LBRACE, TokenType.RBRACE ] ],
		unary:		[ TokenType.PLUS, TokenType.MINUS ],
		binary:		[ TokenType.ATTACH, TokenType.DOT ],
	},
	{
		unary:		[ TokenType.AT ],
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

function printErrorContext(source, lineStart, col) {
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
	console.error(source.substring(lineStart, newLinePos >= 0 ? newLinePos : source.length));
	console.error(s);
}


function main(source, entry) {
	const tokenzieResult = tokenize(source);
	
	if (tokenzieResult.err) {
		console.error(`Failed to tokenize @ Line ${tokenzieResult.line+1}, Col ${tokenzieResult.col+1}: ${tokenzieResult.err}`);
		printErrorContext(source, tokenzieResult.lineStarts[tokenzieResult.line], tokenzieResult.col);
		return;
	}

	const tokens = tokenzieResult.tokens;

	//console.log(tokens);
	
	const parseResult = parse(tokens, operators);

	if (parseResult.err) {
		const tokenPos = parseResult.pos;
		const token = tokens[tokenPos];
		console.error(`Failed to parse @ Line ${token.line+1}, Col ${token.col+1}: ${parseResult.err}`);
		printErrorContext(source, tokenzieResult.lineStarts[token.line], token.col);
		return;
	}

	const ast = parseResult.ast;

	//printAST(ast);

	const err = transform(ast);
	if (err) {
		const token = err.token;
		console.error(`Syntax Error @ Line ${token.line+1}, Col ${token.col+1}: ${err.msg}`);
		printErrorContext(source, tokenzieResult.lineStarts[token.line], token.col);
		return;
	}

	const result = run(ast, entry);
	if (result.err) {
		const err = result.err;
		const token = err.token;
		if (token) {
			console.error(`Runtime Error @ Line ${token.line+1}, Col ${token.col+1}: ${err.msg}`);
			printErrorContext(source, tokenzieResult.lineStarts[token.line], token.col);;
		} else {
			console.error(`Runtime Error: ${err.msg}`);
		}
	} else {
		const value = result.value;
		let raw;
		switch (value.type) {
			case ObjectType.VAR:
				raw = result.value.value;
				break;
			case ObjectType.FUNC:
				raw = '[function]';
				break;
			case ObjectType.NATIVE_FUNC:
				raw = '[native function]';
				break;
			default:
				raw = '[unknown type]';
		}
		console.log(`Succeeded with result: ${raw}`);
	}
}

if (process.argv.length >= 4) {
	main(process.argv[2], process.argv[3]);
}
