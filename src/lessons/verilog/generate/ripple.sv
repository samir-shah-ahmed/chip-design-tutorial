module full_adder(
  input a,
  input b,
  input cin,
  output sum,
  output cout
);
  assign sum = a ^ b ^ cin;
  assign cout = (a & b) | (a & cin) | (b & cin);
endmodule

module ripple #(parameter N = 4) (
  input [N-1:0] a,
  input [N-1:0] b,
  output [N-1:0] sum,
  output cout
);
  // TODO: declare a carry chain and a generate loop of N full_adder instances.
  assign sum = {N{1'b0}};
  assign cout = 1'b0;
endmodule
