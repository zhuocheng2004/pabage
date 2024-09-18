
const TokenType = {
	EMPTY:		'empty',
	IDENTIFIER:	'identifier',
	NUMBER:		'number',
	STRING:		'string',

	// single-char
	LPAREN:		'left_parenthesis',		// ()
	RPAREN:		'right_parenthesis',
	LBRACKET:	'left_bracket',			// []
	RBRACKET:	'right_bracket',
	LBRACE:		'left_brace',			// {}
	RBRACE:		'right_brace',
	LANGLE:		'left_angle',			// <>
	RANGLE:		'right_angle',
	AT:			'at',			// @
	PLUS:		'plus',			// +
	MINUS:		'minus',		// -
	STAR:		'star',			// *
	SLASH:		'slash',		// /
	PERCENT:	'percent',		// %
	COMMA:		'comma',		// ,
	DOT:		'dot',			// .
	COLON:		'colon',		// :
	SEMICOLON:	'semicolon',	// ;
	ASSIGN:		'assign',		// =
	AMP:		'ampersand',	// &
	VERT:		'vertical',		// |
	HAT:		'hat',			// ^
	HASH:		'hash',			// #
	DOLLAR:		'dollar',		// $
	EXCLAM:		'exclamation',	// !
	TILDE:		'tilde',		// ~
	BACKSLASH:	'backslash',	// \
	BACKQUOTE:	'backquote',	// `
	UNDERSCORE:	'underscore',	// _
	QUESTION:	'question',		// ?
	QUOTE:		'quote',		// '
	DQUOTE:		'double_quote',	// "

	// multi-char
	RARROW:		'right_arrow',			// ->
	RDARROW:	'right_double_arrow',	// =>
	EQUAL:		'equal',				// ==
	NEQUAL:		'not_equal',			// !=
	GEQUAL:		'greater_than_equal',	// >=
	LEGUAL:		'less_than_equal',		// <=

	DCOLON:		'double_colon',	// ::

	// virtual tokens generated during parsing
	ATTACH:		'attach',
}


class TokenizeError extends Error {
	constructor(message, path, pos) {
		super(message);
		this.path = path;
		this.pos = pos;
	}
}

class Token {
	constructor(type, pos, path, data = undefined) {
		this.type = type;
		this.pos = pos;
		this.path = path;
		if (data !== undefined) this.data = data;
	}
}

class TokenizeContext {
	constructor(path, text) {
		this.path = path;
		this.text = text;
		this.end = text.length;
		this.pos = 0;
		this.tokens = [];
	}
}


function isLatinOrUnderscore(ch) {
	return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || ch === '_';
}

function isDigit(ch) {
	return ch >= '0' && ch <='9';
}

const codePointOfZero = '0'.codePointAt(0);	// 0x30

function digit2num(ch) {
	return ch.codePointAt(0) - codePointOfZero;
}

function tryGetIdentifier(context) {
	const text = context.text, end = context.end;
	let pos = context.pos;
	const ch0 = text[pos];
	if (!isLatinOrUnderscore(ch0)) {
		return false;
	}

	const pos0 = context.pos;

	let name = ch0;
	pos++;

	while (true) {
		if (pos >= end) {
			break;
		}

		const ch = text[pos];
		if (isLatinOrUnderscore(ch) || isDigit(ch)) {
			pos++;
			name += ch;
		} else {
			break;
		}
	}

	context.pos = pos;
	context.tokens.push(new Token(TokenType.IDENTIFIER, pos0, context.path, name));
	return true;
}

function tryGetNumber(context) {
	const text = context.text, end = context.end;
	let pos = context.pos;
	const ch0 = text[pos], ch1 = text[pos+1];
	if (!isDigit(ch0) && ch0 != '.') {
		return false;
	}

	const pos0 = context.pos;

	let decimalDigits, value;
	if (ch0 === '.') {
		if (!isDigit(ch1)) {
			return false;
		}
		value = 0;
		decimalDigits = 0;
	} else {
		value = digit2num(ch0);
		decimalDigits = -1;
	}
	pos++;

	while (true) {
		if (pos >= end) {
			break;
		}

		const ch = text[pos];
		if (ch === '.') {
			if (decimalDigits >= 0) {
				break;
			} else {
				pos++;
				decimalDigits = 0;
			}
		} else if (isDigit(ch)) {
			pos++;
			value = value * 10 + digit2num(ch);
			if (decimalDigits >= 0) {
				decimalDigits++;
			}
		} else {
			break;
		}
	}

	if (decimalDigits > 0) {
		value = value / Math.pow(10, decimalDigits);
	}

	context.pos = pos;
	context.tokens.push(new Token(TokenType.NUMBER, pos0, context.path, value));
	return true;
}

function tryGetString(context) {
	const text = context.text, end = context.end;
	let pos = context.pos;
	const ch0 = text[pos];

	if (ch0 != '"' && ch0 != '\'') {
		return false;
	}

	const pos0 = context.pos;

	let str = '';
	pos++;

	while (true) {
		if (pos >= end) {
			throw new TokenizeError('non-closed string: unexpected eof', context.path, context.pos);
		}

		const ch = text[pos];
		if (ch === ch0) {
			pos++;
			context.pos = pos;
			context.tokens.push(new Token(TokenType.STRING, pos0, context.path, str));
			return true;
		} else if (ch === '\\') {
			pos++;
			if (pos >= end) {
				throw new TokenizeError('unexpected eof', context.path, context.pos);
			} else {
				const ch1 = text[pos];
				switch (ch1) {
					case '\'':
						pos++;
						str += '\'';
						break;
					case '\"':
						pos++;
						str += '\"';
						break;
					case 'b':
						pos++;
						str += '\b';
						break;
					case 'n':
						pos++;
						str += '\n';
						break;
					case 'r':
						pos++;
						str += '\r';
						break;
					case 't':
						pos++;
						str += '\t';
						break;
					case '\\':
						pos++;
						str += '\\';
						break;
					default:
						throw new TokenizeError('unexpected escape in string', context.path, context.pos);
				}
			}
		} else {
			str += ch;
			pos++;
		}
	}
}

function skipComment(context) {
	const text = context.text, end = context.end;
	let pos = context.pos;
	const ch0 = text[pos];
	const ch1 = pos <= end - 2 ? text[pos+1] : undefined;

	if (ch0 === '/' && ch1 === '*') {
		pos += 2;
		while (true) {
			if (pos >= end) {
				throw new TokenizeError('non-closed comment: unexpected eof', context.path, context.pos);
			}

			if (pos <= end - 2 && text[pos] === '*' && text[pos+1] === '/') {
				context.pos = pos + 2;
				return true;
			}

			pos++;
		}
	} else if (ch0 === '/' && ch1 === '/') {
		pos += 2;
		while (true) {
			if (pos >= end) {
				context.pos = pos;
				return true;
			}

			if (text[pos] === '\n') {
				context.pos = pos + 1;
				return true;
			}

			pos++;
		}
	}

	return false;
}

function tokenize(text, path='<unknown>') {
	const context = new TokenizeContext(path, text);

	while (true) {
		const text = context.text, end = context.end;
		let pos = context.pos;
		if (pos >= end) {
			break;
		}

		if (tryGetIdentifier(context)) {
			continue;
		} else if (tryGetNumber(context)) {
			continue;
		} else if (tryGetString(context)) {
			continue;
		}


		let tokenType = undefined;
		let failed = false;

		const pos0 = context.pos;
	
		const ch0 = text[pos0];
		const ch1 = pos0 <= end - 2 ? text[pos0+1] : undefined;
		switch (ch0) {
			// skip empty tokens
			case '\n':
			case '\r':
			case '\t':
			case ' ':
				context.pos++;
				tokenType = TokenType.EMPTY;
				break;
			case '(':
				context.pos++;
				tokenType = TokenType.LPAREN;
				break;
			case ')':
				context.pos++;
				tokenType = TokenType.RPAREN;
				break;
			case '[':
				context.pos++;
				tokenType = TokenType.LBRACKET;
				break;
			case ']':
				context.pos++;
				tokenType = TokenType.RBRACKET;
				break;
			case '{':
				context.pos++;
				tokenType = TokenType.LBRACE;
				break;
			case '}':
				context.pos++;
				tokenType = TokenType.RBRACE;
				break;
			case '@':
				context.pos++;
				tokenType = TokenType.AT;
				break;
			case '+':
				context.pos++;
				tokenType = TokenType.PLUS;
				break;
			case '-':
				context.pos++;
				tokenType = TokenType.MINUS;
				break;
			case '*':
				context.pos++;
				tokenType = TokenType.STAR;
				break;
			case '/':
				if (ch1 === '*' || ch1 === '/') {
					if (skipComment(context)) {
						continue;
					} else {
						failed = true;
						break;
					}
				} else {
					context.pos++;
					tokenType = TokenType.SLASH;
				}
				break;
			case '%':
				context.pos++;
				tokenType = TokenType.PERCENT;
				break;
			case ',':
				context.pos++;
				tokenType = TokenType.COMMA;
				break;
			case '.':
				context.pos++;
				tokenType = TokenType.DOT;
				break;
			case ':':
				if (ch1 === ':') {
					context.pos += 2;
					tokenType = TokenType.DCOLON;
				} else {
					context.pos++;
					tokenType = TokenType.COLON;
				}
				break;
			case ';':
				context.pos++;
				tokenType = TokenType.SEMICOLON;
				break;
			case '&':
				context.pos++;
				tokenType = TokenType.AMP;
				break;
			case '|':
				context.pos++;
				tokenType = TokenType.VERT;
				break;
			case '^':
				context.pos++;
				tokenType = TokenType.HAT;
				break;
			case '#':
				context.pos++;
				tokenType = TokenType.HASH;
				break;
			case '$':
				context.pos++;
				tokenType = TokenType.DOLLAR;
				break;
			case '=':
				context.pos++;
				switch (ch1) {
					case '=':
						context.pos++;
						tokenType = TokenType.EQUAL;
						break;
					default:
						tokenType = TokenType.ASSIGN;
						break;
				}
				break;
		}

		if (failed) {
			break;
		}

		if (tokenType) {
			if (tokenType != TokenType.EMPTY) {
				context.tokens.push(new Token(tokenType, pos0, path));
			}
			continue;
		}

		throw new TokenizeError('unrecognized token', context.path, context.pos);
	}

	return context.tokens;
}

export {
	TokenType,
	tokenize,
};
