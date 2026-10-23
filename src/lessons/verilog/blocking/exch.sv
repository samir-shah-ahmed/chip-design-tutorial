module exch(
  input clk,
  input rst,
  output reg a,
  output reg b
);
  always @(posedge clk) begin
    if (rst) begin
      a <= 1'b0;
      b <= 1'b1;
    end else begin
      // TODO: swap a and b with non-blocking assignments (<=).
      // Blocking (=) reads the updated a on the next line, so both become 1.
      a = b;
      b = a;
    end
  end
endmodule
