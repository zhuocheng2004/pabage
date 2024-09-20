
import { tokenize } from '../src/tokenizer.js';
import { parse } from '../src/parser.js';
import { NodeType, OperatorType, transform } from '../src/transformer.js';
import { standard_passes } from '../src/passes/passes.js';
import operators from '../src/operators.js';


test('simple', () => {
	const samples = [
		{
			text:	'val t = 1.23',
			ast:	expect.objectContaining({
				type:	NodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.VAR_DEF,
						name:	't',
						init:	expect.objectContaining({
							type:	NodeType.LIT_NUMBER,
							value:	1.23
						})
					})
				]
			})
		},
		{
			text:	'fn main() { return 0; }',
			ast:	expect.objectContaining({
				type:	NodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.FUNC_DEF,
						name:	'main',
						args:	[],
						body:	expect.objectContaining({
							type:	NodeType.CHUNK,
							nodes:	[
								expect.objectContaining({
									type:	NodeType.STAT_RETURN,
									arg:	expect.objectContaining({
										type:	NodeType.LIT_NUMBER,
										value:	0
									})
								})
							]
						})
					})
				]
			})
		},
	];

	for (const sample of samples) {
		const ast = parse(tokenize(sample.text), operators);
		transform(ast, standard_passes);
		expect(ast).toEqual(sample.ast);
	}
});


test('complicated', () => {
	const samples = [
		{
			text:	`
			// demo program
			ns test.example.demo;

			import core.io.print;
			import core.math.cos;
			import core.math.sin;

			val t = 1.23;

			/* demo function */
			export fn main() {
				val c = cos(t);
				var s;
				s = sin(t);
				val ans = c*c + s*s;
				print(ans);

				return 0;
			}
			`,
			ast:	expect.objectContaining({
				type:	NodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.NS,
						path:	[ 'test', 'example', 'demo' ]
					}),
					expect.objectContaining({
						type:	NodeType.STAT_IMPORT,
						path:	[ 'core', 'io' ],
						name:	'print'
					}),
					expect.objectContaining({
						type:	NodeType.STAT_IMPORT,
						path:	[ 'core', 'math' ],
						name:	'cos'
					}),
					expect.objectContaining({
						type:	NodeType.STAT_IMPORT,
						path:	[ 'core', 'math' ],
						name:	'sin'
					}),
					expect.objectContaining({
						type:	NodeType.VAR_DEF,
						name:	't',
						init:	expect.objectContaining({
							type:	NodeType.LIT_NUMBER,
							value:	1.23
						})
					}),
					expect.objectContaining({
						type:	NodeType.FUNC_DEF,
						name:	'main',
						args:	[],
						export:	true,
						body:	expect.objectContaining({
							type:	NodeType.CHUNK,
							nodes:	[
								expect.objectContaining({
									type:	NodeType.VAR_DEF,
									name:	'c',
									constant:	true,
									init:	expect.objectContaining({
										type:   NodeType.EXPR_FUNC_CALL,
										func:   expect.objectContaining({
											type:   NodeType.IDENTIFIER,
											name:   'cos'
										}),
										args:   [
											expect.objectContaining({
												type:   NodeType.IDENTIFIER,
												name:   't'
											}),
										]
									})
								}),
								expect.objectContaining({
									type:	NodeType.VAR_DEF,
									name:	's',
									constant:	false
								}),
								expect.objectContaining({
									type:	NodeType.EXPR_BINARY,
									operator:	OperatorType.ASSIGN,
									arg1:	expect.objectContaining({
										type:	NodeType.IDENTIFIER,
										name:	's'
									}),
									arg2:	expect.objectContaining({
										type:   NodeType.EXPR_FUNC_CALL,
										func:   expect.objectContaining({
											type:   NodeType.IDENTIFIER,
											name:   'sin'
										}),
										args:   [
											expect.objectContaining({
												type:   NodeType.IDENTIFIER,
												name:   't'
											}),
										]
									})
								}),
								expect.objectContaining({
									type:	NodeType.VAR_DEF,
									name:	'ans',
									constant:	true,
									init:	expect.objectContaining({
										type:	NodeType.EXPR_BINARY,
										operator:	OperatorType.PLUS,
										arg1:	expect.objectContaining({
											type:	NodeType.EXPR_BINARY,
											operator:	OperatorType.MULTIPLY,
											arg1:	expect.objectContaining({
												type:   NodeType.IDENTIFIER,
												name:   'c'
											}),
											arg2:	expect.objectContaining({
												type:   NodeType.IDENTIFIER,
												name:   'c'
											})
										}),
										arg2:	expect.objectContaining({
											type:	NodeType.EXPR_BINARY,
											operator:	OperatorType.MULTIPLY,
											arg1:	expect.objectContaining({
												type:   NodeType.IDENTIFIER,
												name:   's'
											}),
											arg2:	expect.objectContaining({
												type:   NodeType.IDENTIFIER,
												name:   's'
											})
										})
									})
								}),
								expect.objectContaining({
									type:   NodeType.EXPR_FUNC_CALL,
									func:   expect.objectContaining({
										type:   NodeType.IDENTIFIER,
										name:   'print'
									}),
									args:   [
										expect.objectContaining({
											type:   NodeType.IDENTIFIER,
											name:   'ans'
										}),
									]
								}),
								expect.objectContaining({
									type:	NodeType.STAT_RETURN,
									arg:	expect.objectContaining({
										type:	NodeType.LIT_NUMBER,
										value:	0
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
		const ast = parse(tokenize(sample.text), operators);
		transform(ast, standard_passes);
		expect(ast).toEqual(sample.ast);
	}
});
