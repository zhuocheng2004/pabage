
import pass_chunk from './chunk.js'
import pass_export from './export.js';
import pass_final from './final.js';
import pass_function_call from './function_call.js';
import pass_function_definition from './function_definition.js';
import pass_import from './import.js';
import pass_namespace from './namespace.js';
import pass_operation from './operation.js';
import pass_primitive from './primitive.js';
import pass_return_statement from './return_statement.js';
import pass_variable_definition from './variable_definition.js';


/* These passes must be performed in this order */
const standard_passes = [
	pass_namespace,
	pass_function_definition,
	pass_variable_definition,
	pass_export,
	pass_import,
	pass_return_statement,
	pass_chunk, 
	pass_function_call, 
	pass_operation, 
	pass_primitive,
	pass_final,
];

export {
	pass_chunk, pass_final, 
	pass_function_call, pass_function_definition, 
	pass_export, pass_import,
	pass_namespace, pass_operation, pass_primitive, 
	pass_return_statement, pass_variable_definition,
	standard_passes
};
