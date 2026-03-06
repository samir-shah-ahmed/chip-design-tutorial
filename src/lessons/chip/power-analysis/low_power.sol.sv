module low_power(
  input        clk, reset, enable,
  input  [7:0] data_in,
  output reg [7:0] data_out
);
  always @(posedge clk) begin
    if (reset)
      data_out <= 8'b0;
    else if (enable)     // only toggle when enabled — saves dynamic power
      data_out <= data_in;
  end
endmodule
