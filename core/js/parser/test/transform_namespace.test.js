
import { tokenize } from '../src/tokenizer';
import { ASTNodeType, parse } from '../src/parser';
import { NodeType, transform } from '../src/transformer';
import pass_namespace from '../src/passes/namespace';
import operators from '../src/operators';


test('simple', () => {
	const samples = [
		{
			text:	'ns demo;',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type: 	NodeType.NS,
						path:	[ 'demo' ]
					}),
					expect.objectContaining({ type: ASTNodeType.DELIMIT }),
				]
			})
		},
		{
			text:	'ns demo { fn main() { } }',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type: 	NodeType.NS,
						path:	[ 'demo' ],
						body:	expect.objectContaining({ type:	ASTNodeType.OP_GROUP })
					}),
				]
			})
		},
		{
			text:	'ns java.lang.util;',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type: 	NodeType.NS,
						path:	[ 'java', 'lang', 'util' ]
					}),
					expect.objectContaining({ type: ASTNodeType.DELIMIT }),
				]
			})
		},
		{
			text:	'ns java.lang.util { val x = exp(1.2); }',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type: 	NodeType.NS,
						path:	[ 'java', 'lang', 'util' ],
						body:	expect.objectContaining({ type:	ASTNodeType.OP_GROUP })
					}),
				]
			})
		},
	];

	for (const sample of samples) {
		const tokenizeResult = tokenize(sample.text);
		expect(tokenizeResult.err).toBeUndefined();

		const parseResult = parse(tokenizeResult.tokens, operators);
		expect(parseResult.err).toBeUndefined();

		const ast = parseResult.ast;
		const err = transform(ast, [ pass_namespace ]);
		expect(err).toBeUndefined();
		expect(ast).toEqual(sample.ast);
	}
});

test('nested', () => {
	const samples = [
		{
			text:	'ns a.b { ns c.d { val z = 3; } ns e.f { fn f() { } } }',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type: 	NodeType.NS,
						path:	[ 'a', 'b' ],
						body:	expect.objectContaining({
							type:	ASTNodeType.OP_GROUP,
							nodes:	[
								expect.objectContaining({
									type:	NodeType.NS,
									path:	[ 'c', 'd' ],
									body:	expect.objectContaining({ type: ASTNodeType.OP_GROUP })
								}),
								expect.objectContaining({
									type:	NodeType.NS,
									path:	[ 'e', 'f' ],
									body:	expect.objectContaining({ type: ASTNodeType.OP_GROUP })
								}),
							]
						})
					}),
				]
			})
		},
		{
			text:	'ns a.b { ns c.d { ns e.f { val msg = \'Hello?\'; } } }',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type: 	NodeType.NS,
						path:	[ 'a', 'b' ],
						body:	expect.objectContaining({
							type:	ASTNodeType.OP_GROUP,
							nodes:	[
								expect.objectContaining({
									type:	NodeType.NS,
									path:	[ 'c', 'd' ],
									body:	expect.objectContaining({
										type: ASTNodeType.OP_GROUP,
										nodes:	[
											expect.objectContaining({
												type:	NodeType.NS,
												path:	[ 'e', 'f' ],
												body:	expect.objectContaining({
													type: ASTNodeType.OP_GROUP
												})
											}),
										]
									})
								}),
							]
						})
					}),
				]
			})
		},
	];

	for (const sample of samples) {
		const tokenizeResult = tokenize(sample.text);
		expect(tokenizeResult.err).toBeUndefined();

		const parseResult = parse(tokenizeResult.tokens, operators);
		expect(parseResult.err).toBeUndefined();

		const ast = parseResult.ast;
		const err = transform(ast, [ pass_namespace ]);
		expect(err).toBeUndefined();
		expect(ast).toEqual(sample.ast);
	}
});
