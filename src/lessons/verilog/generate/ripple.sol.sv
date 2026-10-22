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
  wire [N:0] carry;
  assign carry[0] = 1'b0;
  genvar i;
  generate
    for (i = 0; i < N; i = i + 1) begin : stage
      full_adder u(
        .a(a[i]),
        .b(b[i]),
        .cin(carry[i]),
        .sum(sum[i]),
        .cout(carry[i+1])
      );
    end
  endgenerate
  assign cout = carry[N];
endmodule
