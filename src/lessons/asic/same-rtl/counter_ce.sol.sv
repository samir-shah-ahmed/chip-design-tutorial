module counter_ce(
  input clk,
  input rst_n,
  input ce,
  output reg [7:0] q
);
  always @(posedge clk) begin
    if (!rst_n)
      q <= 8'd0;
    else if (ce)
      q <= q + 8'd1;
  end
endmodule
