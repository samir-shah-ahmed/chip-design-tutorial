module shift2(
  input clk,
  input rst,
  input din,
  output reg dout
);
  reg mid;
  always @(posedge clk) begin
    if (rst) begin
      mid <= 1'b0;
      dout <= 1'b0;
    end else begin
      // TODO: two flip-flops in series. CTS will balance these two clock pins.
      mid <= 1'b0;
      dout <= 1'b0;
    end
  end
endmodule
