module full_adder(
  input a,
  input b,
  input cin,
  output sum,
  output cout
);
  // TODO: sum is the parity of the three inputs.
  // cout is 1 when at least two inputs are 1.
  assign sum = 1'b0;
  assign cout = 1'b0;
endmodule
