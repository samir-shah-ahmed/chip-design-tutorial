module hold(
  input clk,
  input rst,
  input en,
  input [7:0] d,
  output reg [7:0] q
);
  always @(posedge clk) begin
    if (rst)
      q <= 8'd0;
    else
      q <= d; // TODO: update only when en is high
  end
endmodule
