module probe(
  input clk,
  input rst,
  input event_in,
  output reg seen,
  output reg [7:0] cycle
);
  always @(posedge clk) begin
    if (rst) begin
      seen <= 1'b0;
      cycle <= 8'd0;
    end else begin
      cycle <= cycle + 8'd1;
      // TODO: set seen when event_in is high, and do not clear it later.
      if (event_in)
        seen <= seen;
    end
  end
endmodule
