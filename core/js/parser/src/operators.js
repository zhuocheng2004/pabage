
import { TokenType } from "../src/tokenizer";

const operators = [
	{
		enclose:	[ [ TokenType.LPAREN, TokenType.RPAREN ], [ TokenType.LBRACKET, TokenType.RBRACKET ], [ TokenType.LBRACE, TokenType.RBRACE ] ],
		unary:		[ TokenType.PLUS, TokenType.MINUS, TokenType.DCOLON ],
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
		binary:		[ TokenType.EQUAL ],
	},
	{
		binary:		[ TokenType.ASSIGN ],
	}
];

export default operators;
