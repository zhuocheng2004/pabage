
const TokenType = {
	EMPTY:		1,
	IDENTIFIER:	2,
	NUMBER:		3,
	STRING:		4,

	// single-char
	LPAREN:		10,	// ()
	RPAREN:		11,
	LBRACKET:	12,	// []
	RBRACKET:	13,
	LBRACE:		14,	// {}
	RBRACE:		15,
	LANGLE:		16,	// <>
	RANGLE:		17,
	AT:		20,	// @
	PLUS:		21,	// +
	MINUS:		22,	// -
	STAR:		23,	// *
	SLASH:		24,	// /
	PERCENT:	25,	// %
	COMMA:		26,	// ,
	DOT:		27,	// .
	COLON:		28,	// :
	SEMICOLON:	29,	// ;
	ASSISN:		30,	// =
	AMP:		31,	// &
	VERT:		32,	// |
	HAT:		33,	// ^
	HASH:		34,	// #
	DOLLAR:		35,	// $
	EXCLAM:		36,	// !
	TILDE:		37,	// ~
	BACKSLASH:	38,	// \
	BACKQUOTE:	39,	// `
	UNDERSCORE:	40,	// _
	QUESTION:	41,	// ?
	QUOTE:		42,	// '
	DQUOTE:		43,	// "

	// multi-char
	RARROW:		100,	// ->
	RDARROW:	101,	// =>
	EQUAL:		102,	// ==
	NEQUAL:		103,	// !=
	GEQUAL:		104,	// >=
	LEGUAL:		105,	// <=
	PLUSEQUAL:	110,	// +=
	MINUSEQUAL:	111,	// -=
	MULEQUAL:	112,	// *=
	DIVEQUAL:	113,	// /=

	// virtual tokens generated during parse
	EMPTY:		200,
	ATTACH:		201,
};

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

	const pos0 = context.pos, line0 = context.line, col0 = context.col;

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

	context.col += (pos - context.pos);
	context.pos = pos;
	context.tokens.push({
		type:	TokenType.IDENTIFIER,
		data:	name,
		pos:	pos0,
		line:	line0,
		col:	col0,
	});
	return true;
}

function tryGetNumber(context) {
	const text = context.text, end = context.end;
	let pos = context.pos;
	const ch0 = text[pos];
	if (!isDigit(ch0) && ch0 != '.') {
		return false;
	}

	const pos0 = context.pos, line0 = context.line, col0 = context.col;

	let decimalDigits, value;
	if (ch0 === '.') {
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

	context.col += (pos - context.pos);
	context.pos = pos;
	context.tokens.push({
		type:	TokenType.NUMBER,
		data:	value,
		pos:	pos0,
		line:	line0,
		col:	col0,
	});
	return true;
}

function tryGetString(context) {
	const text = context.text, end = context.end;
	let pos = context.pos;
	const ch0 = text[pos];

	if (ch0 != '"' && ch0 != '\'') {
		return false;
	}

	const pos0 = context.pos, line0 = context.line, col0 = context.col;

	let str = '';
	pos++;

	while (true) {
		if (pos >= end) {
			context.err = 'non-closed string: unexpected eof';
			break;
		}

		const ch = text[pos];
		if (ch === ch0) {
			pos++;
			context.col += (pos - context.pos);
			context.pos = pos;
			context.tokens.push({
				type:	TokenType.STRING,
				data:	str,
				pos:	pos0,
				line:	line0,
				col:	col0,
			});
			return true;
		} else if (ch === '\\') {
			pos++;
			if (pos >= end) {
				context.err = 'unexpected eof';
				break;
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
						context.err = 'unexpected escape in string';
						break;
				}
			}

			if (context.err) {
				break;
			}
		} else {
			str += ch;
			pos++;
		}
	}

	return false;
}

function skipComment(context) {
	const text = context.text, end = context.end;
	let pos = context.pos, line = context.line, col = context.col;
	const ch0 = text[pos];
	const ch1 = pos <= end - 2 ? text[pos+1] : undefined;

	if (ch0 === '/' && ch1 === '*') {
		pos += 2;
		col += 2;
		while (true) {
			if (pos >= end) {
				context.err = 'non-closed comment: unexpected eof'
				break;
			}

			if (text[pos] === '\n') {
				context.lineStarts.push(pos+1);
				line++;
				col = 0;
			}

			if (pos <= end - 2 && text[pos] === '*' && text[pos+1] === '/') {
				context.line = line;
				context.pos = pos + 2;
				context.col = col + 2;
				return true;
			}

			pos++;
			col++;
		}
	} else if (ch0 === '/' && ch1 === '/') {
		pos += 2;
		while (true) {
			if (pos >= end) {
				context.col += (pos - context.pos);
				context.pos = pos;
				return true;
			}

			if (text[pos] === '\n') {
				context.pos = pos + 1;
				context.lineStarts.push(pos + 1);
				context.line++;
				context.col = 0;
				return true;
			}

			pos++;
		}
	}

	return false;
}

function tokenize(text) {
	const context = {
		text:	text,
		end:	text.length,
		pos:	0,
		line:	0,
		col:	0,
		tokens:	[],
		lineStarts:	[],
		err:	undefined,
	}

	context.lineStarts.push(0);

	while (true) {
		const text = context.text, end = context.end;
		let pos = context.pos;
		if (pos >= end) {
			break;
		}

		let tokenType = undefined;
		let failed = false;

		const pos0 = context.pos, line0 = context.line, col0 = context.col;

		const ch0 = text[pos];
		const ch1 = pos <= end - 2 ? text[pos+1] : undefined;
		switch (ch0) {
			// skip empty tokens
			case '\n':
				context.pos++;
				context.line++;
				context.col = 0;
				context.lineStarts.push(context.pos);
				tokenType = TokenType.EMPTY;
				break;
			case '\r':
				context.pos++;
				context.col = 0;
				tokenType = TokenType.EMPTY;
				break;
			case '\t':
			case ' ':
				context.pos++; context.col++;
				tokenType = TokenType.EMPTY;
				break;

			case '(':
				context.pos++; context.col++;
				tokenType = TokenType.LPAREN;
				break;
			case ')':
				context.pos++; context.col++;
				tokenType = TokenType.RPAREN;
				break;
			case '[':
				context.pos++; context.col++;
				tokenType = TokenType.LBRACKET;
				break;
			case ']':
				context.pos++; context.col++;
				tokenType = TokenType.RBRACKET;
				break;
			case '{':
				context.pos++; context.col++;
				tokenType = TokenType.LBRACE;
				break;
			case '}':
				context.pos++; context.col++;
				tokenType = TokenType.RBRACE;
				break;
			case '@':
				context.pos++; context.col++;
				tokenType = TokenType.AT;
				break;
			case '+':
				context.pos++; context.col++;
				tokenType = TokenType.PLUS;
				break;
			case '-':
				context.pos++; context.col++;
				tokenType = TokenType.MINUS;
				break;
			case '*':
				context.pos++; context.col++;
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
					context.pos++; context.col++;
					tokenType = TokenType.SLASH;
				}
				break;
			case '%':
				context.pos++; context.col++;
				tokenType = TokenType.PERCENT;
				break;
			case ',':
				context.pos++; context.col++;
				tokenType = TokenType.COMMA;
				break;
			case '.':
				context.pos++; context.col++;
				tokenType = TokenType.DOT;
				break;
			case ';':
				context.pos++; context.col++;
				tokenType = TokenType.SEMICOLON;
				break;
			case '&':
				context.pos++; context.col++;
				tokenType = TokenType.AMP;
				break;
			case '|':
				context.pos++; context.col++;
				tokenType = TokenType.VERT;
				break;
			case '^':
				context.pos++; context.col++;
				tokenType = TokenType.HAT;
				break;
			case '#':
				context.pos++; context.col++;
				tokenType = TokenType.HASH;
				break;
			case '$':
				context.pos++; context.col++;
				tokenType = TokenType.DOLLAR;
				break;
			case '=':
				context.pos++; context.col++;
				switch (ch1) {
					default:
						tokenType = TokenType.ASSISN;
						break;
				}
				break;
		}

		if (failed) {
			break;
		}

		if (tokenType) {
			if (tokenType != TokenType.EMPTY) {
				context.tokens.push({
					type:	tokenType,
					pos:	pos0,
					line:	line0,
					col:	col0,
				})
			}
			continue;
		}

		if (tryGetIdentifier(context)) {
			continue;
		} else if (tryGetNumber(context)) {
			continue;
		} else if (tryGetString(context)) {
			continue;
		}

		if (!context.err) {
			context.err = 'unrecognized token';
		}

		break;

	}

	return {
		tokens: context.tokens,
		err:	context.err,
		pos:	context.pos,
		line:	context.line,
		col:	context.col,
		lineStarts:	context.lineStarts,
		text:	context.text,
	};
}

module.exports = {
	TokenType:	TokenType,
	tokenize:	tokenize,
};
