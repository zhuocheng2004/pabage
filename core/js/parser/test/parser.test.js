
import { TokenType, tokenize } from '../src/tokenizer.js'
import { ASTNodeType, parse } from '../src/parser.js'
import operators from '../src/operators.js';


test('strings with no tokens', () => {
	const texts = [
		'', ' ', '          ',
		' \t\n  \r\t \t  \n\n \r\n\n\r',
		'/*//*/', '/*ABC//ABC\nABC*/', '/*ABC*/\n//123\n/*DEF*/', '//ABC\n//DEF\n', '//ABC/*\n/*DEF*///123',
	];

	for (const text of texts) {
		const parseResult = parse(tokenize(text), operators);
		expect(parseResult.err).toBeUndefined();
		expect(parseResult.ast).toEqual(expect.objectContaining({
			type:	ASTNodeType.ROOT,
			nodes:	[],
		}));
	}
});

test('arithmetic expressions', () => {
	const samples = [
		{
			text:	'a + 2',
			ast:	expect.objectContaining({
				type: ASTNodeType.ROOT,
				nodes: [
					expect.objectContaining({
						index: 0,
						type: ASTNodeType.OP_BINARY,
						token: expect.objectContaining({ type: TokenType.PLUS }),
						node1: expect.objectContaining({
							type: ASTNodeType.PRIMITIVE,
							token: expect.objectContaining({ type: TokenType.IDENTIFIER, data: 'a' })
						}),
						node2: expect.objectContaining({
							type: ASTNodeType.PRIMITIVE,
							token: expect.objectContaining({ type: TokenType.NUMBER, data: 2 })
						})
					}),
				]
			})
		},
		{
			text:	'1 + b - "ABC" + 4',
			ast:	expect.objectContaining({
				type: ASTNodeType.ROOT,
				nodes: [
					expect.objectContaining({
						index: 0,
						type: ASTNodeType.OP_BINARY,
						token: expect.objectContaining({ type: TokenType.PLUS }),
						node1: expect.objectContaining({
							type: ASTNodeType.OP_BINARY,
							token: expect.objectContaining({ type: TokenType.MINUS }),
							node1: expect.objectContaining({
								type: ASTNodeType.OP_BINARY,
								token: expect.objectContaining({ type: TokenType.PLUS }),
								node1: expect.objectContaining({
									type: ASTNodeType.PRIMITIVE,
									token: expect.objectContaining({ type: TokenType.NUMBER, data: 1 })
								}),
								node2: expect.objectContaining({
									type: ASTNodeType.PRIMITIVE,
									token: expect.objectContaining({ type: TokenType.IDENTIFIER, data: 'b' })
								})
							}),
							node2: expect.objectContaining({
								type: ASTNodeType.PRIMITIVE,
								token: expect.objectContaining({ type: TokenType.STRING, data: 'ABC' })
							})
						}),
						node2: expect.objectContaining({
							type: ASTNodeType.PRIMITIVE,
							token: expect.objectContaining({ type: TokenType.NUMBER, data: 4 })
						})
					}),
				]
			})
		},
		{
			text:	'a + pow(b - 5, 2) * -4',
			ast:	expect.objectContaining({
				type: ASTNodeType.ROOT,
				nodes: [
					expect.objectContaining({
						index: 0,
						type: ASTNodeType.OP_BINARY,
						token: expect.objectContaining({ type: TokenType.PLUS }),
						node1: expect.objectContaining({
							type: ASTNodeType.PRIMITIVE,
							token: expect.objectContaining({ type: TokenType.IDENTIFIER, data: 'a' })
						}),
						node2: expect.objectContaining({
							type: ASTNodeType.OP_BINARY,
							token: expect.objectContaining({ type: TokenType.STAR }),
							node1: expect.objectContaining({
								type: ASTNodeType.OP_BINARY,
								token: expect.objectContaining({ type: TokenType.ATTACH }),
								node1: expect.objectContaining({
									type: ASTNodeType.PRIMITIVE,
									token: expect.objectContaining({ type: TokenType.IDENTIFIER, data: 'pow' })
								}),
								node2: expect.objectContaining({
									type: ASTNodeType.OP_GROUP,
									token: expect.objectContaining({ type: TokenType.LPAREN }),
									nodes: [
										expect.objectContaining({
											index: 0,
											type: ASTNodeType.OP_BINARY,
											token: expect.objectContaining({ type: TokenType.MINUS }),
											node1: expect.objectContaining({
												type: ASTNodeType.PRIMITIVE,
												token: expect.objectContaining({ type: TokenType.IDENTIFIER, data: 'b' })
											}),
											node2: expect.objectContaining({
												type: ASTNodeType.PRIMITIVE,
												token: expect.objectContaining({ type: TokenType.NUMBER, data: 5 })
											}),
										}),
										expect.objectContaining({
											index: 1,
											type: ASTNodeType.PRIMITIVE,
											token: expect.objectContaining({ type: TokenType.NUMBER, data: 2 })
										}),
									],
									delimiters: [
										expect.objectContaining({ type: TokenType.COMMA }),
									]
								})
							}),
							node2: expect.objectContaining({
								type: ASTNodeType.OP_PREFIX,
								token: expect.objectContaining({ type: TokenType.MINUS }),
								node: expect.objectContaining({
									type: ASTNodeType.PRIMITIVE,
									token: expect.objectContaining({ type: TokenType.NUMBER, data: 4 })
								})
							})
						})
					}),
				]
			})
		},
	];

	for (const sample of samples) {
		const parseResult = parse(tokenize(sample.text), operators);
		expect(parseResult.err).toBeUndefined();
		expect(parseResult.ast).toEqual(sample.ast);
	}
});

test('code segments', () => {
	const samples = [
		{
			text:	'val a = 2 + b;',
			ast:	expect.objectContaining({
				type: ASTNodeType.ROOT,
				nodes: [
					expect.objectContaining({
						index: 0,
						type: ASTNodeType.PRIMITIVE,
						token: expect.objectContaining({ type: TokenType.IDENTIFIER, data: 'val' })
					}),
					expect.objectContaining({
						index: 1,
						type: ASTNodeType.OP_BINARY,
						token: expect.objectContaining({ type: TokenType.ASSIGN }),
						node1: expect.objectContaining({
							type: ASTNodeType.PRIMITIVE,
							token: expect.objectContaining({ type: TokenType.IDENTIFIER, data: 'a' })
						}),
						node2: expect.objectContaining({
							type: ASTNodeType.OP_BINARY,
							token: expect.objectContaining({ type: TokenType.PLUS }),
							node1: expect.objectContaining({
								type: ASTNodeType.PRIMITIVE,
								token: expect.objectContaining({ type: TokenType.NUMBER, data: 2 })
							}),
							node2: expect.objectContaining({
								type: ASTNodeType.PRIMITIVE,
								token: expect.objectContaining({ type: TokenType.IDENTIFIER, data: 'b' })
							}),
						}),
					}),
					expect.objectContaining({
						index: 2,
						type: ASTNodeType.DELIMIT,
						token: expect.objectContaining({ type: TokenType.SEMICOLON })
					}),
				]
			})
		},
		{
			text:	'fn f(a, b) { return a + b; }',
			ast:	expect.objectContaining({
				type: ASTNodeType.ROOT,
				nodes: [
					expect.objectContaining({
						index: 0,
						type: ASTNodeType.PRIMITIVE,
						token: expect.objectContaining({ type: TokenType.IDENTIFIER, data: 'fn' })
					}),
					expect.objectContaining({
						index: 1,
						type: ASTNodeType.OP_BINARY,
						token: expect.objectContaining({ type: TokenType.ATTACH }),
						node1: expect.objectContaining({
							type: ASTNodeType.OP_BINARY,
							token: expect.objectContaining({ type: TokenType.ATTACH }),
							node1: expect.objectContaining({
								type: ASTNodeType.PRIMITIVE,
								token: expect.objectContaining({ type: TokenType.IDENTIFIER, data: 'f' })
							}),
							node2: expect.objectContaining({
								type: ASTNodeType.OP_GROUP,
								token: expect.objectContaining({ type: TokenType.LPAREN }),
								nodes: [
									expect.objectContaining({
										index: 0,
										type: ASTNodeType.PRIMITIVE,
										token: expect.objectContaining({ type: TokenType.IDENTIFIER, data: 'a' })
									}),
									expect.objectContaining({
										index: 1,
										type: ASTNodeType.PRIMITIVE,
										token: expect.objectContaining({ type: TokenType.IDENTIFIER, data: 'b' })
									}),
								],
								delimiters: [
									expect.objectContaining({ type: TokenType.COMMA }),
								]
							})
						}),
						node2: expect.objectContaining({
							type: ASTNodeType.OP_GROUP,
							token: expect.objectContaining({ type: TokenType.LBRACE }),
							nodes: [
								expect.objectContaining({
									type: ASTNodeType.PRIMITIVE,
									token: expect.objectContaining({ type: TokenType.IDENTIFIER, data: 'return' })
								}),
								expect.objectContaining({
									type: ASTNodeType.OP_BINARY,
									token: expect.objectContaining({ type: TokenType.PLUS }),
									node1: expect.objectContaining({
										type: ASTNodeType.PRIMITIVE,
										token: expect.objectContaining({ type: TokenType.IDENTIFIER, data: 'a' })
									}),
									node2: expect.objectContaining({
										type: ASTNodeType.PRIMITIVE,
										token: expect.objectContaining({ type: TokenType.IDENTIFIER, data: 'b' })
									}),
								}),
							], 
							delimiters: [
								expect.objectContaining({ type: TokenType.EMPTY }),
								expect.objectContaining({ type: TokenType.SEMICOLON }),
							]
						})
					})
				]
			})
		},
		{
			text:	'if (a == 0) { /* true */ } else { /* false */ }',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						index:	0,
						type:	ASTNodeType.OP_BINARY,
						token:	expect.objectContaining({ type: TokenType.ATTACH }),
						node1:	expect.objectContaining({
							type:	ASTNodeType.OP_BINARY,
							token:	expect.objectContaining({ type: TokenType.ATTACH }),
							node1:	expect.objectContaining({
								type:	ASTNodeType.PRIMITIVE,
								token:	expect.objectContaining({ type: TokenType.IDENTIFIER, data: 'if' })
							}),
							node2:	expect.objectContaining({
								type:	ASTNodeType.OP_GROUP,
								token:	expect.objectContaining({ type: TokenType.LPAREN }),
								nodes:	[
									expect.objectContaining({
										index:	0,
										type:	ASTNodeType.OP_BINARY,
										token:	expect.objectContaining({ type: TokenType.EQUAL }),
										node1:	expect.objectContaining({
											type:	ASTNodeType.PRIMITIVE,
											token:	expect.objectContaining({ type: TokenType.IDENTIFIER, data: 'a' })
										}),
										node2:	expect.objectContaining({
											type:	ASTNodeType.PRIMITIVE,
											token:	expect.objectContaining({ type: TokenType.NUMBER, data: 0 })
										})
									}),
								],
								delimiters: []
							})
						}),
						node2:	expect.objectContaining({
							type:	ASTNodeType.OP_GROUP,
							token:	expect.objectContaining({ type: TokenType.LBRACE }),
							nodes:	[],
							delimiters: []
						})
					}),
					expect.objectContaining({
						index:	1,
						type:	ASTNodeType.OP_BINARY,
						token:	expect.objectContaining({ type: TokenType.ATTACH }),
						node1:	expect.objectContaining({
							type:	ASTNodeType.PRIMITIVE,
							token:	expect.objectContaining({ type: TokenType.IDENTIFIER, data: 'else' })
						}),
						node2:	expect.objectContaining({
							type:	ASTNodeType.OP_GROUP,
							token:	expect.objectContaining({ type: TokenType.LBRACE }),
							nodes:	[],
							delimiters: []
						})
					}),
				]
			})
		},
	];

	for (const sample of samples) {
		const parseResult = parse(tokenize(sample.text), operators);
		expect(parseResult.err).toBeUndefined();
		expect(parseResult.ast).toEqual(sample.ast);
	}
});
